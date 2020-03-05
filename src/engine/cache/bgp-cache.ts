/* file: bgp-cache.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import { AsyncCacheEntry, AsyncLRUCache } from './cache-base'
import { AsyncCache } from './cache-interfaces'
import { Pipeline } from '../pipeline/pipeline'
import { PipelineStage } from '../pipeline/pipeline-engine'
import { Bindings } from '../../rdf/bindings'
import { Algebra } from 'sparqljs'
import { rdf, sparql } from '../../utils'
import { BinarySearchTree } from 'binary-search-tree'
import { differenceWith, findIndex, maxBy } from 'lodash'

export interface BasicGraphPattern {
  patterns: Algebra.TripleObject[],
  graphIRI: string
}

interface SavedBGP {
  bgp: BasicGraphPattern,
  key: string
}

/**
 * Hash a BGP with a Graph IRI
 * @param bgp - BGP to hash
 */
function hashBasicGraphPattern (bgp: BasicGraphPattern): string {
  return `${sparql.hashBGP(bgp.patterns)}&graph-iri=${bgp.graphIRI}`
}

/**
 * An async cache that stores the solution bindings from BGP evaluation
 * @author Thomas Minier
 */
export interface BGPCache extends AsyncCache<BasicGraphPattern, Bindings, string> {
  /**
   * Search for a BGP in the cache that is a subset of the input BGP
   * This method enable the user to use the Semantic caching technique,
   * to evaluate a BGP using one of its cached subset.
   * @param bgp - Basic Graph pattern
   * @return A pair [subset BGP, set of patterns not in cache]
   */
  findSubset (bgp: BasicGraphPattern): [Algebra.TripleObject[], Algebra.TripleObject[]]

  /**
   * Access the cache and returns a pipeline stage that returns the content of the cache for a given BGP
   * @param bgp - Cache key, i.e., a Basic Graph pattern
   * @param onCancel - Callback invoked when the cache entry is deleted before being committed, so we can produce an alternative pipeline stage to continue query processing. Typically, it is the pipeline stage used to evaluate the BGP without the cache.
   * @return A pipeline stage that returns the content of the cache entry for the given BGP
   */
  getAsPipeline (bgp: BasicGraphPattern, onCancel?: () => PipelineStage<Bindings>): PipelineStage<Bindings>
}

/**
 * An implementation of a {@link BGPCache} using an {@link AsyncLRUCache}
 * @author Thomas Minier
 */
export class LRUBGPCache implements BGPCache {
  // Main index: for each triple pattern, register the BGP where their occurs
  // Used to speed up the #findSubset method
  private readonly _allKeys: BinarySearchTree<string, SavedBGP>
  // Secondary index: track the triple patterns of each BGP.
  // Used to clear the primary index when items slides out from the cache
  private readonly _patternsPerBGP: Map<string, BasicGraphPattern>
  // AsyncCache used to store set of solution bindings
  private readonly _cache: AsyncLRUCache<string, Bindings, string>

  /**
   * Constructor
   * @param maxSize - The maximum size of the cache
   * @param maxAge - Maximum age in ms
   */
  constructor (maxSize: number, maxAge: number) {
    this._patternsPerBGP = new Map()
    this._allKeys = new BinarySearchTree({
      checkValueEquality: (a: SavedBGP, b: SavedBGP) => a.key === b.key
    })
    this._cache = new AsyncLRUCache(maxSize, maxAge, (item: AsyncCacheEntry<Bindings, string>) => {
      return item.content.length
    }, (key: string) => {
      // remove index entries when they slide out
      if (this._patternsPerBGP.has(key)) {
        const bgp = this._patternsPerBGP.get(key)!
        bgp.patterns.forEach(pattern => this._allKeys.delete(rdf.hashTriple(pattern), { bgp, key }))
        this._patternsPerBGP.delete(key)
      }
    })
  }

  has (bgp: BasicGraphPattern): boolean {
    return this._cache.has(hashBasicGraphPattern(bgp))
  }

  update (bgp: BasicGraphPattern, item: Bindings, writerID: string): void {
    const key = hashBasicGraphPattern(bgp)
    if (!this._cache.has(key)) {
      // update the indexes
      this._patternsPerBGP.set(key, bgp)
      bgp.patterns.forEach(pattern => this._allKeys.insert(rdf.hashTriple(pattern), { bgp, key }))
    }
    this._cache.update(key, item, writerID)
  }

  get (bgp: BasicGraphPattern): Promise<Bindings[]> | null {
    return this._cache.get(hashBasicGraphPattern(bgp))
  }

  getAsPipeline (bgp: BasicGraphPattern, onCancel?: () => PipelineStage<Bindings>): PipelineStage<Bindings> {
    const bindings = this.get(bgp)
    if (bindings === null) {
      return Pipeline.getInstance().empty()
    }
    let iterator = Pipeline.getInstance().from(bindings)
    return Pipeline.getInstance().mergeMap(iterator, bindings => {
      // if the results is empty AND the cache do not contains the BGP
      // it means that the entry has been deleted before its insertion completed
      if (bindings.length === 0 && !this.has(bgp)) {
        return (onCancel === undefined) ? Pipeline.getInstance().empty() : onCancel()
      }
      return Pipeline.getInstance().from(bindings.map(b => b.clone()))
    })
  }

  commit (bgp: BasicGraphPattern, writerID: string): void {
    this._cache.commit(hashBasicGraphPattern(bgp), writerID)
  }

  delete (bgp: BasicGraphPattern, writerID: string): void {
    const key = hashBasicGraphPattern(bgp)
    this._cache.delete(key, writerID)
    // clear the indexes
    this._patternsPerBGP.delete(key)
    bgp.patterns.forEach(pattern => this._allKeys.delete(rdf.hashTriple(pattern), { bgp, key }))
  }

  count (): number {
    return this._cache.count()
  }

  findSubset (bgp: BasicGraphPattern): [Algebra.TripleObject[], Algebra.TripleObject[]] {
    // if the bgp is in the cache, then the computation is simple
    if (this.has(bgp)) {
      return [bgp.patterns, []]
    }
    // otherwise, we search for all candidate subsets
    let matches = []
    for (let pattern of bgp.patterns) {
      const searchResults = this._allKeys
        .search(rdf.hashTriple(pattern))
        .filter(v => {
          // remove all BGPs that are not a subset of the input BGP
          // we use lodash.findIndex + rdf.tripleEquals to check for triple pattern equality
          return v.bgp.patterns.every(a => findIndex(bgp.patterns, b => rdf.tripleEquals(a, b)) > -1)
        })
      matches.push({ pattern, searchResults })
    }
    // compute the largest subset BGP and the missing patterns (missingPatterns = input_BGP - subset_BGP)
    let foundPatterns: Algebra.TripleObject[] = []
    let maxBGPLength = -1
    for (let match of matches) {
      if (match.searchResults.length > 0) {
        const localMax = maxBy(match.searchResults, v => v.bgp.patterns.length)
        if (localMax !== undefined && localMax.bgp.patterns.length > maxBGPLength) {
          maxBGPLength = localMax.bgp.patterns.length
          foundPatterns = localMax.bgp.patterns
        }
      }
    }
    return [foundPatterns, differenceWith(bgp.patterns, foundPatterns, rdf.tripleEquals)]
  }
}
