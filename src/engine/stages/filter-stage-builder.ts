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

import StageBuilder from './stage-builder'
import exists from '../../operators/exists'
import sparqlFilter from '../../operators/sparql-filter'
import { Algebra } from 'sparqljs'
import { PipelineStage } from '../pipeline/pipeline-engine'
import { Bindings } from '../../rdf/bindings'
import ExecutionContext from '../context/execution-context'
import { CustomFunctions } from '../../operators/expressions/sparql-expression'

/**
 * A FilterStageBuilder evaluates FILTER clauses
 * @author Thomas Minier
 */
export default class FilterStageBuilder extends StageBuilder {
  execute (source: PipelineStage<Bindings>, filterNode: Algebra.FilterNode, customFunctions: CustomFunctions, context: ExecutionContext): PipelineStage<Bindings> {
    switch (filterNode.expression.operator) {
      case 'exists':
        return exists(source, filterNode.expression.args, this.builder!, false, context)
      case 'notexists':
        return exists(source, filterNode.expression.args, this.builder!, true, context)
      default:
        return sparqlFilter(source, filterNode.expression, customFunctions)
    }
  }
}
