/* file : bind-join.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

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
import { Bindings } from '../../rdf/bindings'
import { Pipeline } from '../../engine/pipeline/pipeline'
import { PipelineStage } from '../../engine/pipeline/pipeline-engine'
import { rdf, evaluation } from '../../utils'
import BGPStageBuilder from '../../engine/stages/bgp-stage-builder'
import ExecutionContext from '../../engine/context/execution-context'
import ContextSymbols from '../../engine/context/symbols'
import Graph from '../../rdf/graph'
import rewritingOp from './rewriting-op'

// The default size of the bucket of Basic Graph Patterns used by the Bound Join algorithm
const BOUND_JOIN_BUFFER_SIZE = 15

// A Basic graph pattern, i.e., a set of triple patterns
// This type alias is defined to make the algorithm more readable ;)
type BasicGraphPattern = Algebra.TripleObject[]

/**
 * Rewrite a triple pattern using a rewriting key,
 * i.e., append "_key" to each SPARQL variable in the triple pattern
 * @author Thomas Minier
 * @param key - Rewriting key
 * @param tp - Triple pattern to rewrite
 * @return The rewritten triple pattern
 */
function rewriteTriple (triple: Algebra.TripleObject, key: number): Algebra.TripleObject {
  const res = Object.assign({}, triple)
  if (rdf.isVariable(triple.subject)) {
    res.subject = `${triple.subject}_${key}`
  }
  if (rdf.isVariable(triple.predicate)) {
    res.predicate = `${triple.predicate}_${key}`
  }
  if (rdf.isVariable(triple.object)) {
    res.object = `${triple.object}_${key}`
  }
  return res
}

/**
 * Join the set of bindings produced by a pipeline stage with a BGP using the Bound Join algorithm.
 * @author Thomas Minier
 * @param  source - Source of bindings
 * @param  bgp - Basic Pattern to join with
 * @param  graph - Graphe queried
 * @param  Context - Query execution context
 * @return A pipeline stage which evaluates the bound join
 */
export default function boundJoin (source: PipelineStage<Bindings>, bgp: Algebra.TripleObject[], graph: Graph, builder: BGPStageBuilder, context: ExecutionContext) {
  let bufferSize = BOUND_JOIN_BUFFER_SIZE
  if (context.hasProperty(ContextSymbols.BOUND_JOIN_BUFFER_SIZE)) {
    bufferSize = context.getProperty(ContextSymbols.BOUND_JOIN_BUFFER_SIZE)
  }
  return Pipeline.getInstance().mergeMap(Pipeline.getInstance().bufferCount(source, bufferSize), bucket => {
    // simple case: first join in the pipeline
    if (bucket.length === 1 && bucket[0].isEmpty) {
      if (context.cachingEnabled()) {
        return evaluation.cacheEvalBGP(bgp, graph, context.cache!, builder, context)
      }
      return graph.evalBGP(bgp, context)
    } else {
      // The bucket of rewritten basic graph patterns
      const bgpBucket: BasicGraphPattern[] = []
      // The bindings of the bucket that cannot be evaluated with a bound join for this BGP
      const regularBindings: Bindings[] = []
      // A rewriting table dedicated to this instance of the bound join
      const rewritingTable = new Map()
      // The rewriting key (a simple counter) for this instance of the bound join
      let key = 0
      // Build the bucket of Basic Graph patterns
      bucket.map(binding => {
        const boundedBGP: BasicGraphPattern = []
        let nbBounded = 0

        // build the bounded BGP using the current set of bindings
        bgp.forEach(triple => {
          const boundedTriple = rewriteTriple(binding.bound(triple), key)
          boundedBGP.push(boundedTriple)
          // track the number of fully bounded triples, i.e., triple patterns without any SPARQL variables
          if (!rdf.isVariable(boundedTriple.subject) && !rdf.isVariable(boundedTriple.predicate) && !rdf.isVariable(boundedTriple.object)) {
            nbBounded++
          }
        })

        // if the whole BGP is bounded, then the current set of bindings cannot be processed
        // using a bound join and we must process it using a regular Index Join.
        // Otherwise, the partially bounded BGP is suitable for a bound join
        if (nbBounded === bgp.length) {
          regularBindings.push(binding)
        } else {
          // save the rewriting into the table
          rewritingTable.set(key, binding)
          bgpBucket.push(boundedBGP)
        }
        key++
      })

      let boundJoinStage: PipelineStage<Bindings> = Pipeline.getInstance().empty()
      let regularJoinStage: PipelineStage<Bindings> = Pipeline.getInstance().empty()

      // first, evaluates the bucket of partially bounded BGPs using a bound join
      if (bgpBucket.length > 0) {
        boundJoinStage = rewritingOp(graph, bgpBucket, rewritingTable, builder, context)
      }

      // then, evaluates the remaining bindings using a bound join
      if (regularBindings.length > 0) {
        // otherwiwe, we create a new context to force the execution using Index Joins
        const newContext = context.clone()
        newContext.setProperty(ContextSymbols.FORCE_INDEX_JOIN, true)
        // Invoke the BGPStageBuilder to evaluate the bucket
        regularJoinStage = builder._buildIterator(Pipeline.getInstance().of(...regularBindings), graph, bgp, newContext)
      }

      // merge the two pipeline stages to produce the join results
      return Pipeline.getInstance().merge(boundJoinStage, regularJoinStage)
    }
  })
  /*return Pipeline.getInstance().fromAsync((input: StreamPipelineInput<Bindings>) => {
    let sourceClosed = false
    let activeIterators = 0

    // Check if a custom bucket size for the bound join buffer has been set by in the context
    // Otherwise, use the default one
    let bufferSize = BOUND_JOIN_BUFFER_SIZE
    if (context.hasProperty(ContextSymbols.BOUND_JOIN_BUFFER_SIZE)) {
      bufferSize = context.getProperty(ContextSymbols.BOUND_JOIN_BUFFER_SIZE)
    }

    // Utility function used to close the processing
    // after all active iterators have completed
    function tryClose () {
      activeIterators--
      if (sourceClosed && activeIterators === 0) {
        input.complete()
      }
    }

    // Buffer the output of the pipeline to generates bucket,
    // then apply the bound join algorithm to perform the join
    // between the bucket of bindings and the input BGP
    Pipeline.getInstance()
      .bufferCount(source, bufferSize)
      .subscribe(bucket => {
        activeIterators++
        // simple case: first join in the pipeline
        if (bucket.length === 1 && bucket[0].isEmpty) {
          let iterator
          if (context.cachingEnabled()) {
            iterator = evaluation.cacheEvalBGP(bgp, graph, context.cache!, builder, context)
          } else {
            iterator = graph.evalBGP(bgp, context)
          }
          iterator.subscribe((b: Bindings) => {
            input.next(b)
          }, (err: Error) => input.error(err), () => tryClose())
        } else {
          // The bucket of rewritten basic graph patterns
          const bgpBucket: BasicGraphPattern[] = []
          // A rewriting table dedicated to this instance of the bound join
          const rewritingTable = new Map()
          // The rewriting key (a simple counter) for this instance of the bound join
          let key = 0

          // Build the bucket of Basic Graph patterns
          bucket.map(binding => {
            const boundedBGP: BasicGraphPattern = []
            bgp.forEach(triple => {
              let boundedTriple: Algebra.TripleObject = binding.bound(triple)
              // rewrite the triple pattern and save the rewriting into the table
              boundedTriple = rewriteTriple(boundedTriple, key)
              rewritingTable.set(key, binding)
              boundedBGP.push(boundedTriple)
            })
            bgpBucket.push(boundedBGP)
            key++
          })
          // Evaluates the bucket using the Sage server
          rewritingOp(graph, bgpBucket, rewritingTable, builder, context)
            .subscribe(b => input.next(b), err => input.error(err), () => tryClose())
        }
      }, err => input.error(err), () => { sourceClosed = true })
  })*/
}
