/* file : sparql-expression.js
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

const operations = require('./sparql-operations.js')
const { parseTerm, isVariable } = require('../../utils.js').rdf
const { isString } = require('lodash')

function bindArgument (variable) {
  return bindings => {
    if (variable in bindings) {
      return parseTerm(bindings[variable])
    }
    return null
  }
}

/**
 * Compile and evaluate a SPARQL expression (found in FILTER clauses, for example)
 * @author Thomas Minier
 */
class SPARQLExpression {
  constructor (expression) {
    this._expression = this._compileExpression(expression)
  }

  _compileExpression (expression) {
    // simple case: the expression is a SPARQL variable or a RDF term
    if (isString(expression)) {
      if (isVariable(expression)) {
        return bindArgument(expression)
      }
      const compiledTerm = parseTerm(expression)
      return () => compiledTerm
    }
    // recusrively compile the expression's arguments
    const args = expression.args.map(arg => this._compileExpression(arg))
    if (!(expression.operator in operations)) {
      throw new Error(`Unsupported SPARQL operation: ${expression.operator}`)
    }
    const operation = operations[expression.operator]
    // operation case: compile each argument, then evaluate the expression
    return bindings => {
      return operation(...args.map(arg => arg(bindings)))
    }
  }

  evaluate (bindings = {}) {
    return this._expression(bindings).asJS
  }
}

module.exports = SPARQLExpression
