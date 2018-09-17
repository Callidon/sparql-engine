/* file : sparql-expression.ts
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

import { SPARQL_AGGREGATES } from './sparql-aggregates'
import { SPARQL_OPERATIONS } from './sparql-operations'
import { RDFTerm } from '../../rdf-terms'
import { rdf } from '../../utils'
import { isArray, isString } from 'lodash'
import { Algebra } from 'sparqljs'

/**
 * An input SPARQL expression to be compiled
 */
export type InputExpression = Algebra.Expression | string | string[]

/**
 * A SPARQL expression compiled as a function
 */
export type CompiledExpression = (bindings: Object) => RDFTerm | RDFTerm[] | null

function bindArgument (variable: string): (bindings: Object) => RDFTerm | null {
  return (bindings: Object) => {
    if (variable in bindings) {
      return rdf.parseTerm(bindings[variable])
    }
    return null
  }
}

/**
 * Compile and evaluate a SPARQL expression (found in FILTER clauses, for example)
 * @author Thomas Minier
 */
export default class SPARQLExpression {
  readonly _expression: CompiledExpression
  constructor (expression: InputExpression) {
    this._expression = this._compileExpression(expression)
  }

  _compileExpression (expression: InputExpression): CompiledExpression {
    // simple case: the expression is a SPARQL variable or a RDF term
    if (isString(expression)) {
      if (rdf.isVariable(expression)) {
        return bindArgument(expression)
      }
      const compiledTerm = rdf.parseTerm(expression)
      return () => compiledTerm
    } else if (isArray(expression)) {
      // IN and NOT IN expressions accept arrays as argument
      const compiledTerms = expression.map(rdf.parseTerm)
      return () => compiledTerms
    } else if (expression.type === 'operation') {
      const opExpression = <Algebra.SPARQLExpression> expression
      // operation case: recursively compile each argument, then evaluate the expression
      const args = opExpression.args.map(arg => this._compileExpression(arg))
      if (!(opExpression.operator in SPARQL_OPERATIONS)) {
        throw new Error(`Unsupported SPARQL operation: ${opExpression.operator}`)
      }
      const operation = SPARQL_OPERATIONS[opExpression.operator]
      return (bindings: Object) => {
        return operation(...args.map(arg => arg(bindings)))
      }
    } else if (expression.type === 'aggregate') {
      const aggExpression = <Algebra.AggregateExpression> expression
      // aggregation case
      if (!(aggExpression.aggregation! in SPARQL_AGGREGATES)) {
        throw new Error(`Unsupported SPARQL aggregation: ${aggExpression.aggregation}`)
      }
      const aggregation = SPARQL_AGGREGATES[aggExpression.aggregation]
      return (bindings: Object) => {
        if ('__aggregate' in bindings) {
          return aggregation(aggExpression.expression, bindings['__aggregate'], aggExpression.separator)
        }
        return bindings
      }
    }
    throw new Error(`Unsupported SPARQL operation type found: ${expression.type}`)
  }

  evaluate (bindings = {}) {
    return this._expression(bindings)
  }
}
