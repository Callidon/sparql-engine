/* file : graph.ts
MIT License

Copyright (c) 2018 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import { Readable, AsyncIterator, single, TransformIterator } from 'asynciterator'
import { Algebra } from 'sparqljs'
import IndexJoinOperator from '../operators/join/index-join-operator'
import { rdf } from '../utils'
import { Bindings, BindingBase } from './bindings'

export interface PatternMetadata {
  triple: Algebra.TripleObject,
  cardinality: number,
  nbVars: number
}

/**
 * Comparator function for sorting triple pattern
 * by ascending cardinality and descending number of variables
 * @private
 * @param  {Object} a - Metadata about left triple
 * @param  {Object} b - Metadata about right triple
 * @return Comparaison result (-1, 1, 0)
 */
function sortPatterns (a: PatternMetadata, b: PatternMetadata): number {
  if (a.cardinality < b.cardinality) {
    return -1
  } else if (a.cardinality > b.cardinality) {
    return 1
  } else if (a.nbVars > b.nbVars) {
    return -1
  } else if (a.nbVars < b.nbVars) {
    return 1
  }
  return 0
}

/**
 * An abstract RDF Graph, accessed through a RDF Dataset
 * @abstract
 * @author Thomas Minier
 */
export default abstract class Graph {
  private _iri: string
  constructor () {
    this._iri = ''
  }

  /**
   * Get the IRI of the Graph
   * @return The IRI of the Graph
   */
  get iri (): string {
    return this._iri
  }

  /**
   * Set the IRI of the Graph
   * @param value - The new IRI of the Graph
   */
  set iri (value: string) {
    this._iri = value
  }

  /**
   * Insert a RDF triple into the RDF Graph
   * @param  {Object}   triple - RDF Triple to insert
   * @param  {string}   triple.subject - RDF triple's subject
   * @param  {string}   triple.predicate - RDF triple's predicate
   * @param  {string}   triple.object - RDF triple's object
   * @return A Promise fulfilled when the insertion has been completed
   */
  abstract insert (triple: Algebra.TripleObject): Promise<void>

  /**
   * Delete a RDF triple from the RDF Graph
   * @param  {Object}   triple - RDF Triple to delete
   * @param  {string}   triple.subject - RDF triple's subject
   * @param  {string}   triple.predicate - RDF triple's predicate
   * @param  {string}   triple.object - RDF triple's object
   * @return A Promise fulfilled when the deletion has been completed
   */
  abstract delete (triple: Algebra.TripleObject): Promise<void>

  /**
   * Returns an iterator that finds RDF triples matching a triple pattern in the graph.
   * @param  {Object}   triple - Triple pattern to find
   * @param  {string}   triple.subject - Triple pattern's subject
   * @param  {string}   triple.predicate - Triple pattern's predicate
   * @param  {string}   triple.object - Triple pattern's object
   * @return An iterator which finds RDF triples matching a triple pattern
   */
  abstract find (triple: Algebra.TripleObject, options: Object): Readable<Algebra.TripleObject>

  /**
   * Remove all RDF triples in the Graph
   * @return A Promise fulfilled when the clear operation has been completed
   */
  abstract clear (): Promise<void>

  /**
   * Estimate the cardinality of a Triple pattern, i.e.,
   * the number of matching RDF Triples in the RDF Graph.
   * @param  {Object}   triple - Triple pattern to estimate cardinality
   * @param  {string}   triple.subject - Triple pattern's subject
   * @param  {string}   triple.predicate - Triple pattern's predicate
   * @param  {string}   triple.object - Triple pattern's object
   * @return A Promise fulfilled with the pattern's estimated cardinality
   */
  abstract estimateCardinality (triple: Algebra.TripleObject): Promise<number>

  /**
   * Evaluates a Basic Graph pattern, i.e., a set of triple patterns, on the Graph using an iterator.
   * @param  {Object[]} bgp - The set of triple patterns to evaluate
   * @param  {Object} options - Execution options
   * @return An iterator which evaluates the Basic Graph pattern on the Graph
   */
  evalBGP (bgp: Algebra.TripleObject[], options: Object): AsyncIterator<Bindings> {
    const iter = new TransformIterator<Bindings,Bindings>()
    // collect cardinalities of each triple pattern
    Promise.all(bgp.map(triple => {
      return this.estimateCardinality(triple).then(c => {
        return { triple, cardinality: c, nbVars: rdf.countVariables(triple) }
      })
    })).then((results: PatternMetadata[]) => {
      results.sort(sortPatterns)
      const start: AsyncIterator<Bindings> = single(new BindingBase())
      iter.source = results.reduce((iter: AsyncIterator<Bindings>, v: PatternMetadata) => {
        return new IndexJoinOperator(iter, v.triple, this, options)
      }, start)
    })
    return iter
  }
}
