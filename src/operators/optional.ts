/* file : optional-iterator.ts
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

import { Pipeline } from '../engine/pipeline/pipeline'
import { PipelineStage } from '../engine/pipeline/pipeline-engine'
import { Algebra } from 'sparqljs'
import PlanBuilder from '../engine/plan-builder'
import { Bindings } from '../rdf/bindings'
import ExecutionContext from '../engine/context/execution-context'

/**
 * Handles an SPARQL OPTIONAL clause in the following way:
 * 1) Buffer every bindings produced by the source iterator.
 * 2) Set a flag to False if the OPTIONAL clause yield at least one set of bindings.
 * 3) When the OPTIONAL clause if evaluated, check if the flag is True.
 * 4) If the flag is True, then we output all buffered values. Otherwise, we do nothing.
 * @see {@link https://www.w3.org/TR/sparql11-query/#optionals}
 * @author Thomas Minier
 */
export default function optional (source: PipelineStage<Bindings>, patterns: Algebra.PlanNode[], builder: PlanBuilder, context: ExecutionContext): PipelineStage<Bindings> {
  const seenBefore: Bindings[] = []
  const engine = Pipeline.getInstance()
  const start = engine.tap(source, (bindings: Bindings) => {
    seenBefore.push(bindings)
  })
  let leftOp = builder._buildWhere(start, patterns, context)
  leftOp = engine.tap(leftOp, (bindings: Bindings) => {
    // remove values that matches a results from seenBefore
    const index = seenBefore.findIndex((b: Bindings) => {
      return b.isSubset(bindings)
    })
    if (index > 0) {
      seenBefore.splice(index, 1)
    }
  })
  return engine.merge(leftOp, engine.from(seenBefore))
}
