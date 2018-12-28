/* file : rewritings.ts
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

import { Algebra } from 'sparqljs'
import Dataset from '../../rdf/dataset'
import { partition } from 'lodash'

/**
 * Create a triple pattern that matches all RDF triples in a graph
 * @private
 * @return A triple pattern that matches all RDF triples in a graph
 */
function allPattern (): Algebra.TripleObject {
  return {
    subject: '?s',
    predicate: '?p',
    object: '?o'
  }
}

/**
 * Create a BGP that matches all RDF triples in a graph
 * @private
 * @return A BGP that matches all RDF triples in a graph
 */
function allBGP (): Algebra.BGPNode {
  return {
    type: 'bgp',
    triples: [allPattern()]
  }
}

/**
 * Build a SPARQL GROUP that selects all RDF triples from the Default Graph or a Named Graph
 * @private
 * @param  source          - Source graph
 * @param  dataset         - RDF dataset used to select the source
 * @param  isSilent        - True if errors should not be reported
 * @param  [isWhere=false] - True if the GROUP should belong to a WHERE clause
 * @return The SPARQL GROUP clasue
 */
function buildGroupClause (source: Algebra.UpdateGraphTarget, dataset: Dataset, isSilent: boolean): Algebra.BGPNode | Algebra.UpdateGraphNode {
  if (source.default) {
    return allBGP()
  } else {
    // a SILENT modifier prevents errors when using an unknown graph
    if (!(dataset.hasNamedGraph(source.name!)) && !isSilent) {
      throw new Error(`Unknown Source Graph in ADD query ${source.name}`)
    }
    return {
      type: 'graph',
      name: source.name!,
      triples: [allPattern()]
    }
  }
}

/**
 * Build a SPARQL WHERE that selects all RDF triples from the Default Graph or a Named Graph
 * @private
 * @param  source          - Source graph
 * @param  dataset         - RDF dataset used to select the source
 * @param  isSilent        - True if errors should not be reported
 * @param  [isWhere=false] - True if the GROUP should belong to a WHERE clause
 * @return The SPARQL GROUP clasue
 */
function buildWhereClause (source: Algebra.UpdateGraphTarget, dataset: Dataset, isSilent: boolean): Algebra.BGPNode | Algebra.GraphNode {
  if (source.default) {
    return allBGP()
  } else {
    // a SILENT modifier prevents errors when using an unknown graph
    if (!(dataset.hasNamedGraph(source.name!)) && !isSilent) {
      throw new Error(`Unknown Source Graph in ADD query ${source.name}`)
    }
    const bgp: Algebra.BGPNode = {
      type: 'bgp',
      triples: [allPattern()]
    }
    return {
      type: 'graph',
      name: source.name!,
      patterns: [bgp]
    }
  }
}

/**
 * Rewrite an ADD query into a INSERT query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#add
 * @param  addQuery - Parsed ADD query
 * @param  dataset - related RDF dataset
 * @return Rewritten ADD query
 */
export function rewriteAdd (addQuery: Algebra.UpdateCopyMoveNode, dataset: Dataset): Algebra.UpdateQueryNode {
  return {
    updateType: 'insertdelete',
    silent: addQuery.silent,
    insert: [buildGroupClause(addQuery.destination, dataset, addQuery.silent)],
    where: [buildWhereClause(addQuery.source, dataset, addQuery.silent)]
  }
}

/**
 * Rewrite a COPY query into a CLEAR + INSERT/DELETE query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#copy
 * @param copyQuery - Parsed COPY query
 * @param dataset - related RDF dataset
 * @return Rewritten COPY query, i.e., a sequence [CLEAR query, INSERT query]
 */
export function rewriteCopy (copyQuery: Algebra.UpdateCopyMoveNode, dataset: Dataset): [Algebra.UpdateClearNode, Algebra.UpdateQueryNode] {
  // first, build a CLEAR query to empty the destination
  const clear: Algebra.UpdateClearNode = {
    type: 'clear',
    silent: copyQuery.silent,
    graph: {type: 'graph'}
  }
  if (copyQuery.destination.default) {
    clear.graph.default = true
  } else {
    clear.graph.type = copyQuery.destination.type
    clear.graph.name = copyQuery.destination.name
  }
  // then, build an INSERT query to copy the data
  const update = rewriteAdd(copyQuery, dataset)
  return [clear, update]
}

/**
 * Rewrite a MOVE query into a CLEAR + INSERT/DELETE + CLEAR query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#move
 * @param moveQuery - Parsed MOVE query
 * @param dataset - related RDF dataset
 * @return Rewritten MOVE query, i.e., a sequence [CLEAR query, INSERT query, CLEAR query]
 */
export function rewriteMove (moveQuery: Algebra.UpdateCopyMoveNode, dataset: Dataset): [Algebra.UpdateClearNode, Algebra.UpdateQueryNode, Algebra.UpdateClearNode] {
  // first, build a classic COPY query
  const [ clear_before, update ] = rewriteCopy(moveQuery, dataset)
  // then, append a CLEAR query to clear the source graph
  const clear_after: Algebra.UpdateClearNode = {
    type: 'clear',
    silent: moveQuery.silent,
    graph: {type: 'graph'}
  }
  if (moveQuery.source.default) {
    clear_after.graph.default = true
  } else {
    clear_after.graph.type = moveQuery.source.type
    clear_after.graph.name = moveQuery.source.name
  }
  return [clear_before, update, clear_after]
}

/**
 * Extract property paths triples and classic triples from a set of RDF triples.
 * It also performs a first rewriting of some property paths.
 * @param  bgp - Set of RDF triples
 * @return A tuple [classic triples, triples with property paths, set of variables added during rewriting]
 */
export function extractPropertyPaths (bgp: Algebra.BGPNode): [Algebra.TripleObject[], Algebra.PathTripleObject[], string[]] {
  const parts = partition(bgp.triples, triple => typeof(triple.predicate) === 'string')
  let classicTriples: Algebra.TripleObject[] = parts[0] as Algebra.TripleObject[]
  let pathTriples: Algebra.PathTripleObject[] = parts[1] as Algebra.PathTripleObject[]
  let variables: string[] = []

  if (pathTriples.length > 0) {
    // review property paths and rewrite those equivalent to a regular BGP
    const paths: Algebra.PathTripleObject[] = []
    // first rewriting phase
    pathTriples.forEach((triple, tIndex) => {
      const t = triple as Algebra.PathTripleObject
      // 1) unpack sequence paths into a set of RDF triples
      if (t.predicate.pathType === '/') {
        t.predicate.items.forEach((pred, seqIndex) => {
          const joinVar = `?seq_${tIndex}_join_${seqIndex}`
          const nextJoinVar = `?seq_${tIndex}_join_${seqIndex + 1}`
          variables.push(joinVar)
          // non-property paths triples are fed to the BGP executor
          if (typeof(pred) === 'string') {
            classicTriples.push({
              subject: (seqIndex == 0) ? triple.subject : joinVar,
              predicate: pred,
              object: (seqIndex == t.predicate.items.length - 1) ? triple.object : nextJoinVar
            })
          } else {
            paths.push({
              subject: (seqIndex == 0) ? triple.subject : joinVar,
              predicate: pred,
              object: (seqIndex == t.predicate.items.length - 1) ? triple.object : nextJoinVar
            })
          }
        })
      } else {
        paths.push(t)
      }
    })
    pathTriples = paths
  }
  return [classicTriples, pathTriples, variables]
}
