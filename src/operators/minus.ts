/* file : minus.ts
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
import { concat, intersection } from 'lodash'
import { Bindings } from '../rdf/bindings'

/**
 * Evaluates a SPARQL MINUS clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#neg-minus}
 * @author Thomas Minier
 * @param leftSource - Left input {@link PipelineStage}
 * @param rightSource - Right input {@link PipelineStage}
 * @return A {@link PipelineStage} which evaluate the MINUS operation
 */
export default function minus (leftSource: PipelineStage<Bindings>, rightSource: PipelineStage<Bindings>) {
  // first materialize the right source in a buffer, then apply difference on the left source
  const engine = Pipeline.getInstance()
  let op = engine.reduce(rightSource, (acc: Bindings[], b: Bindings) => concat(acc, b), [])
  return engine.mergeMap(op, (buffer: Bindings[]) => {
    return engine.filter(leftSource, (bindings: Bindings) => {
      const leftKeys = Array.from(bindings.variables())
      // mu_a is compatible with mu_b if,
      // for all v in intersection(dom(mu_a), dom(mu_b)), mu_a[v] = mu_b[v]
      const isCompatible = buffer.some((b: Bindings) => {
        const rightKeys = Array.from(b.variables())
        const commonKeys = intersection(leftKeys, rightKeys)
        return commonKeys.every((k: string) => b.get(k) === bindings.get(k))
      })
      // only output non-compatible bindings
    return !isCompatible
    })
  })
}
