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

import SPARQL_AGGREGATES from './sparql-aggregates'
import SPARQL_OPERATIONS from './sparql-operations'
import CUSTOM_OPERATIONS from './custom-operations'
import { rdf } from '../../utils'
import { isArray, isString, uniqBy } from 'lodash'
import { Algebra } from 'sparqljs'
import { Bindings } from '../../rdf/bindings'
import { Term } from 'rdf-js'

/**
 * An input SPARQL expression to be compiled
 */
export type InputExpression = Algebra.Expression | string | string[]

/**
 * A SPARQL expression compiled as a function
 */
export type CompiledExpression = (bindings: Bindings) => Term | Term[] | null

/**
 * Type alias to describe the shape of custom functions. It's basically a JSON object from an IRI (in string form) to a function of 0 to many RDFTerms that produces an RDFTerm.
 */
export type CustomFunctions = { [key: string]: (...args: (Term | Term[] | null)[]) => Term }

function bindArgument (variable: string): (bindings: Bindings) => Term | null {
  return (bindings: Bindings) => {
    if (bindings.has(variable)) {
      return rdf.fromN3(bindings.get(variable)!)
    }
    return null
  }
}

/**
 * Compile and evaluate a SPARQL expression (found in FILTER clauses, for example)
 * @author Thomas Minier
 */
export class SPARQLExpression {
  private readonly _expression: CompiledExpression

  /**
   * Constructor
   * @param expression - SPARQL expression
   */
  constructor (expression: InputExpression, customFunctions?: CustomFunctions) {
    this._expression = this._compileExpression(expression, customFunctions)
  }

  /**
   * Recursively compile a SPARQL expression into a function
   * @param  expression - SPARQL expression
   * @return Compiled SPARQL expression
   */
  private _compileExpression (expression: InputExpression, customFunctions?: CustomFunctions): CompiledExpression {
    // case 1: the expression is a SPARQL variable to bound or a RDF term
    if (isString(expression)) {
      if (rdf.isVariable(expression)) {
        return bindArgument(expression)
      }
      const compiledTerm = rdf.fromN3(expression)
      return () => compiledTerm
    } else if (isArray(expression)) {
      // case 2: the expression is a list of RDF terms
      // because IN and NOT IN expressions accept arrays as argument
      const compiledTerms = expression.map(rdf.fromN3)
      return () => compiledTerms
    } else if (expression.type === 'operation') {
      // case 3: a SPARQL operation, so we recursively compile each argument
      // and then evaluate the expression
      const opExpression = expression as Algebra.SPARQLExpression
      const args = opExpression.args.map(arg => this._compileExpression(arg, customFunctions))
      if (!(opExpression.operator in SPARQL_OPERATIONS)) {
        throw new Error(`Unsupported SPARQL operation: ${opExpression.operator}`)
      }
      const operation = SPARQL_OPERATIONS[opExpression.operator]
      return (bindings: Bindings) => {
        return operation(...args.map(arg => arg(bindings)))
      }
    } else if (expression.type === 'aggregate') {
      // case 3: a SPARQL aggregation
      const aggExpression = expression as Algebra.AggregateExpression
      if (!(aggExpression.aggregation in SPARQL_AGGREGATES)) {
        throw new Error(`Unsupported SPARQL aggregation: ${aggExpression.aggregation}`)
      }
      const aggregation = SPARQL_AGGREGATES[aggExpression.aggregation]
      return (bindings: Bindings) => {
        if (bindings.hasProperty('__aggregate')) {
          const aggVariable = aggExpression.expression as string
          let rows = bindings.getProperty('__aggregate')
          if (aggExpression.distinct) {
            rows[aggVariable] = uniqBy(rows[aggVariable], rdf.toN3)
          }
          return aggregation(aggVariable, rows, aggExpression.separator)
        }
        return bindings
      }
    } else if (expression.type === 'functionCall') {
      // last case: the expression is a custom function
      const functionExpression = expression as Algebra.FunctionCallExpression
      let customFunction: any
      // custom operations defined by the framework
      if (functionExpression.function.startsWith('https://callidon.github.io/sparql-engine/functions#')) {
        customFunction =
        functionExpression.function in CUSTOM_OPERATIONS
          ? CUSTOM_OPERATIONS[functionExpression.function]
          : null
      } else {
        // custom operations defined by the user
        customFunction =
        (customFunctions && functionExpression.function in customFunctions)
          ? customFunctions[functionExpression.function]
          : null
      }

      if (!customFunction) {
        throw new Error(`Custom function could not be found: ${functionExpression.function}`)
      }
      return (bindings: Bindings) => {
        try {
          const args = functionExpression.args.map(args => this._compileExpression(args, customFunctions))
          return customFunction(...args.map(arg => arg(bindings)))
        } catch (e) {
          // In section 10 of the sparql docs (https://www.w3.org/TR/sparql11-query/#assignment) it states:
          // "If the evaluation of the expression produces an error, the variable remains unbound for that solution but the query evaluation continues."
          // unfortunately this means the error is silent unless some logging is introduced here,
          // which is probably not desired unless a logging framework is introduced
          return null
        }
      }
    }
    throw new Error(`Unsupported SPARQL operation type found: ${expression.type}`)
  }

  /**
   * Evaluate the expression using a set of mappings
   * @param  bindings - Set of mappings
   * @return Results of the evaluation
   */
  evaluate (bindings: Bindings): Term | Term[] | null {
    return this._expression(bindings)
  }
}
