/* file : triple-operator.ts
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

import { Pipeline } from '../../engine/pipeline/pipeline'
import { PipelineStage } from '../../engine/pipeline/pipeline-engine'
import Graph from '../../rdf/graph'
import { Bindings, BindingBase } from '../../rdf/bindings'
import { Algebra } from 'sparqljs'
import { rdf } from '../../utils'
import { mapKeys, pickBy } from 'lodash'
import ExecutionContext from '../../engine/context/execution-context'

/**
 * Perform a join between a source of solution bindings (left relation)
 * and a triple pattern (right relation) using the Index Nested Loop Join algorithm.
 * This algorithm is more efficient if the cardinality of the left relation is smaller
 * than the cardinality of the right one.
 * @param source - Left input (a {@link PipelineStage})
 * @param pattern - Triple pattern to join with (right relation)
 * @param graph   - RDF Graph on which the join is performed
 * @param context - Execution context
 * @return A {@link PipelineStage} which evaluate the join
 * @author Thomas Minier
 */
export default function indexJoin (source: PipelineStage<Bindings>, pattern: Algebra.TripleObject, graph: Graph, context: ExecutionContext) {
  const engine = Pipeline.getInstance()
  return engine.mergeMap(source, (bindings: Bindings) => {
    const boundedPattern = bindings.bound(pattern)
    // const hasVars = some(boundedPattern, (v: any) => v.startsWith('?'))
    return engine.map(engine.from(graph.find(boundedPattern, context)), (item: Algebra.TripleObject) => {
      let temp = pickBy(item, (v, k) => {
        return rdf.isVariable(boundedPattern[k])
      })
      temp = mapKeys(temp, (v, k) => {
        return boundedPattern[k]
      })
      // if (size(temp) === 0 && hasVars) return null
      return BindingBase.fromObject(temp).union(bindings)
    })
  })
}
