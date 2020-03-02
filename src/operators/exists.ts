/* file : exists.ts
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

import { Pipeline } from '../engine/pipeline/pipeline'
import { PipelineStage } from '../engine/pipeline/pipeline-engine'
import { Bindings, BindingBase } from '../rdf/bindings'
import { PlanBuilder } from '../engine/plan-builder'
import ExecutionContext from '../engine/context/execution-context'

interface ConditionalBindings {
  bindings: Bindings,
  output: boolean
}

/**
 * Evaluates a SPARQL FILTER (NOT) EXISTS clause
 * TODO this function could be simplified using a filterMap like operator, we should check if Rxjs offers that filterMap
 * @author Thomas Minier
 * @param source    - Source {@link PipelineStage}
 * @param groups    - Content of the FILTER clause
 * @param builder   - Plan builder used to evaluate subqueries
 * @param notexists - True if the filter is NOT EXISTS, False otherwise
 * @param context   - Execution context
 * @return A {@link PipelineStage} which evaluate the FILTER (NOT) EXISTS operation
 */
export default function exists (source: PipelineStage<Bindings>, groups: any[], builder: PlanBuilder, notexists: boolean, context: ExecutionContext) {
  const defaultValue: Bindings = new BindingBase()
  defaultValue.setProperty('exists', false)
  const engine = Pipeline.getInstance()
  let evaluator = engine.mergeMap(source, (bindings: Bindings) => {
    let op = builder._buildWhere(engine.of(bindings), groups, context)
    op = engine.defaultValues(op, defaultValue)
    op = engine.first(op)
    return engine.map(op, (b: Bindings) => {
      const exists: boolean = (!b.hasProperty('exists')) || b.getProperty('exists')
      return {
        bindings,
        output: (exists && (!notexists)) || ((!exists) && notexists)
      }
    })
  })
  evaluator = engine.filter(evaluator, (b: ConditionalBindings) => {
    return b.output
  })
  return engine.map(evaluator, (b: ConditionalBindings) => b.bindings)
}
