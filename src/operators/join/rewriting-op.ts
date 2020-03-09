/* file : rewriting-op.ts
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

import { Pipeline } from '../../engine/pipeline/pipeline'
import ExecutionContext from '../../engine/context/execution-context'
import Graph from '../../rdf/graph'
import { Bindings } from '../../rdf/bindings'
import { evaluation } from '../../utils'
import { Algebra } from 'sparqljs'
import { PipelineStage } from '../../engine/pipeline/pipeline-engine'
import BGPStageBuilder from '../../engine/stages/bgp-stage-builder'

/**
 * Find a rewriting key in a list of variables
 * For example, in [ ?s, ?o_1 ], the rewriting key is 1
 * @private
 */
function findKey (variables: IterableIterator<string>, maxValue: number = 15): number {
  let key = -1
  for (let v of variables) {
    for (let i = 0; i < maxValue; i++) {
      if (v.endsWith(`_${i}`)) {
        return i
      }
    }
  }
  return key
}

/**
 * Undo the bound join rewriting on solutions bindings, e.g., rewrite all variables "?o_1" to "?o"
 * @private
 */
function revertBinding (key: number, input: Bindings, variables: IterableIterator<string>): Bindings {
  const newBinding = input.empty()
  for (let vName of variables) {
    let suffix = `_${key}`
    if (vName.endsWith(suffix)) {
      const index = vName.indexOf(suffix)
      newBinding.set(vName.substring(0, index), input.get(vName)!)
    } else {
      newBinding.set(vName, input.get(vName)!)
    }
  }
  return newBinding
}

/**
 * Undo the rewriting on solutions bindings, and then merge each of them with the corresponding input binding
 * @private
 */
function rewriteSolutions (bindings: Bindings, rewritingMap: Map<number, Bindings>): Bindings {
  const key = findKey(bindings.variables())
  // rewrite binding, and then merge it with the corresponding one in the bucket
  let newBinding = revertBinding(key, bindings, bindings.variables())
  if (rewritingMap.has(key)) {
    newBinding = newBinding.union(rewritingMap.get(key)!)
  }
  return newBinding
}

/**
 * A special operator used to evaluate a UNION query with a RDF Graph,
 * and then rewrite bindings generated and performs union with original bindings.
 * It is designed to be used in the bound join algorithm
 * @author Thomas Minier
 * @private
 * @param  graph - Graph queried
 * @param  bgpBucket - List of BGPs to evaluate
 * @param  rewritingTable - Map <rewriting key -> original bindings>
 * @param  context - Query execution context
 * @return A pipeline stage which evaluates the query.
 */
export default function rewritingOp (graph: Graph, bgpBucket: Algebra.TripleObject[][], rewritingTable: Map<number, Bindings>, builder: BGPStageBuilder, context: ExecutionContext) {
  let source
  if (context.cachingEnabled()) {
    // partition the BGPs that can be evaluated using the cache from the others
    const stages: PipelineStage<Bindings>[] = []
    const others: Algebra.TripleObject[][] = []
    bgpBucket.forEach(patterns => {
      if (context.cache!.has({ patterns, graphIRI: graph.iri })) {
        stages.push(evaluation.cacheEvalBGP(patterns, graph, context.cache!, builder, context))
      } else {
        others.push(patterns)
      }
    })
    // merge all sources from the cache first, and then the evaluation of bgp that are not in the cache
    source = Pipeline.getInstance().merge(Pipeline.getInstance().merge(...stages), graph.evalUnion(others, context))
  } else {
    source = graph.evalUnion(bgpBucket, context)
  }
  return Pipeline.getInstance().map(source, bindings => rewriteSolutions(bindings, rewritingTable))
}
