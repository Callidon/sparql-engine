/* file : filter-stage-builder.ts
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

import * as SPARQL from 'sparqljs'
import exists from '../../operators/exists.js'
import { CustomFunctions } from '../../operators/expressions/sparql-expression.js'
import sparqlFilter from '../../operators/sparql-filter.js'
import { Bindings } from '../../rdf/bindings.js'
import ExecutionContext from '../context/execution-context.js'
import { PipelineStage } from '../pipeline/pipeline-engine.js'
import StageBuilder from './stage-builder.js'

/**
 * A FilterPattern evaluates filter Filter clauses
 * @author Thomas Minier
 */
export default class FilterStageBuilder extends StageBuilder {
  execute(
    source: PipelineStage<Bindings>,
    pattern: SPARQL.FilterPattern,
    customFunctions: CustomFunctions,
    context: ExecutionContext,
  ): PipelineStage<Bindings> {
    const expression = pattern.expression as SPARQL.OperationExpression
    if (['operation', 'functionCall'].includes(expression.type)) {
      switch (expression.operator) {
        case 'exists':
          return exists(
            source,
            expression.args as SPARQL.Pattern[],
            this.builder!,
            false,
            context,
          )
        case 'notexists':
          return exists(
            source,
            expression.args as SPARQL.Pattern[],
            this.builder!,
            true,
            context,
          )
        default:
          return sparqlFilter(source, expression, customFunctions)
      }
    } else {
      throw new Error(
        `FilterPattern: expression type not supported ${expression}`,
      )
    }
  }
}
