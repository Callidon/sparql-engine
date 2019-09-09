/* file : sparql-filter.ts
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
import SPARQLExpression from './expressions/sparql-expression'
import { Algebra } from 'sparqljs'
import { Bindings } from '../rdf/bindings'
import { CustomFunctions } from '../engine/plan-builder'

/**
 * Evaluate SPARQL Filter clauses
 * @see {@link https://www.w3.org/TR/sparql11-query/#expressions}
 * @author Thomas Minier
 * @param source - Input {@link PipelineStage}
 * @param expression - FILTER expression
 * @param customFunctions - User-defined SPARQL functions (optional)
 * @return A {@link PipelineStage} which evaluate the FILTER operation
 */
export default function sparqlFilter (source: PipelineStage<Bindings>, expression: Algebra.Expression, customFunctions?: CustomFunctions) {
  const expr = new SPARQLExpression(expression, customFunctions)
  return Pipeline.getInstance().filter(source, (bindings: Bindings) => {
    const value: any = expr.evaluate(bindings)
    return value !== null && value.asJS
  })
}
