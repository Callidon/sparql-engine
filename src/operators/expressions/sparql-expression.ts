/* file : sparql-expression.ts
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

import SPARQL_AGGREGATES from './sparql-aggregates'
import SPARQL_OPERATIONS from './sparql-operations'
import CUSTOM_AGGREGATES from './custom-aggregates'
import CUSTOM_OPERATIONS from './custom-operations'
import { rdf } from '../../utils'
import { merge, isArray, isString, uniqBy } from 'lodash'
import { Algebra } from 'sparqljs'
import { Bindings } from '../../rdf/bindings'
import { Term } from 'rdf-js'

/**
 * An input SPARQL expression to be compiled
 */
export type InputExpression = Algebra.Expression | string | string[]

/**
 * The output of a SPARQL expression's evaluation, one of the following
 * * A RDFJS Term.
 * * An array of RDFJS Terms.
 * * An iterator that yields RDFJS Terms or null values.
 * * A `null` value, which indicates that the expression's evaluation has failed.
 */
export type ExpressionOutput = Term | Term[] | Iterable<Term | null> | null

/**
 * A SPARQL expression compiled as a function
 */
export type CompiledExpression = (bindings: Bindings) => ExpressionOutput

/**
 * Type alias to describe the shape of custom functions. It's basically a JSON object from an IRI (in string form) to a function of 0 to many RDFTerms that produces an RDFTerm.
 */
export type CustomFunctions = { [key: string]: (...args: (Term | Term[] | null)[]) => ExpressionOutput }

/**
 * Test if a SPARQL expression is a SPARQL operation
 * @param expr - SPARQL expression, in sparql.js format
 * @return True if the SPARQL expression is a SPARQL operation, False otherwise
 */
function isOperation (expr: Algebra.Expression): expr is Algebra.SPARQLExpression {
  return expr.type === 'operation'
}

/**
 * Test if a SPARQL expression is a SPARQL aggregation
 * @param expr - SPARQL expression, in sparql.js format
 * @return True if the SPARQL expression is a SPARQL aggregation, False otherwise
 */
function isAggregation (expr: Algebra.Expression): expr is Algebra.AggregateExpression {
  return expr.type === 'aggregate'
}

/**
 * Test if a SPARQL expression is a SPARQL function call (like a custom function)
 * @param expr - SPARQL expression, in sparql.js format
 * @return True if the SPARQL expression is a SPARQL function call, False otherwise
 */
function isFunctionCall (expr: Algebra.Expression): expr is Algebra.FunctionCallExpression {
  return expr.type === 'functionCall'
}

/**
 * Get a function that, given a SPARQL variable, fetch the associated RDF Term in an input set of bindings,
 * or null if it was not found.
 * @param variable - SPARQL variable
 * A fetch the RDF Term associated with the variable in an input set of bindings, or null if it was not found.
 */
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
    // merge custom operations defined by the framework & by the user
    const customs = merge({}, CUSTOM_OPERATIONS, customFunctions)
    this._expression = this._compileExpression(expression, customs)
  }

  /**
   * Recursively compile a SPARQL expression into a function
   * @param  expression - SPARQL expression
   * @return Compiled SPARQL expression
   */
  private _compileExpression (expression: InputExpression, customFunctions: CustomFunctions): CompiledExpression {
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
    } else if (isOperation(expression)) {
      // case 3: a SPARQL operation, so we recursively compile each argument
      // and then evaluate the expression
      const args = expression.args.map(arg => this._compileExpression(arg, customFunctions))
      if (!(expression.operator in SPARQL_OPERATIONS)) {
        throw new Error(`Unsupported SPARQL operation: ${expression.operator}`)
      }
      const operation = SPARQL_OPERATIONS[expression.operator]
      return (bindings: Bindings) => operation(...args.map(arg => arg(bindings)))
    } else if (isAggregation(expression)) {
      // case 3: a SPARQL aggregation
      if (!(expression.aggregation in SPARQL_AGGREGATES)) {
        throw new Error(`Unsupported SPARQL aggregation: ${expression.aggregation}`)
      }
      const aggregation = SPARQL_AGGREGATES[expression.aggregation]
      return (bindings: Bindings) => {
        if (bindings.hasProperty('__aggregate')) {
          const aggVariable = expression.expression as string
          let rows = bindings.getProperty('__aggregate')
          if (expression.distinct) {
            rows[aggVariable] = uniqBy(rows[aggVariable], rdf.toN3)
          }
          return aggregation(aggVariable, rows, expression.separator)
        }
        throw new SyntaxError(`SPARQL aggregation error: you are trying to use the ${expression.aggregation} SPARQL aggregate outside of an aggregation query.`)
      }
    } else if (isFunctionCall(expression)) {
      // last case: the expression is a custom function
      let customFunction: any
      let isAggregate = false
      const functionName = expression.function
      // custom aggregations defined by the framework
      if (functionName.toLowerCase() in CUSTOM_AGGREGATES) {
        isAggregate = true
        customFunction = CUSTOM_AGGREGATES[functionName.toLowerCase()]
      } else if (functionName in customFunctions) {
        // custom operations defined by the user & the framework
        customFunction = customFunctions[functionName]
      } else {
        throw new SyntaxError(`Custom function could not be found: ${functionName}`)
      }
      if (isAggregate) {
        return (bindings: Bindings) => {
          if (bindings.hasProperty('__aggregate')) {
            const rows = bindings.getProperty('__aggregate')
            return customFunction(...expression.args, rows)
          }
          throw new SyntaxError(`SPARQL aggregation error: you are trying to use the ${functionName} SPARQL aggregate outside of an aggregation query.`)
        }
      }
      return (bindings: Bindings) => {
        try {
          const args = expression.args.map(args => this._compileExpression(args, customFunctions))
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
  evaluate (bindings: Bindings): ExpressionOutput {
    return this._expression(bindings)
  }
}
