/* file : bind-operator.js
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

const { TransformIterator } = require('asynciterator')
const SPARQLExpression = require('./expressions/sparql-expression.js')

/**
 * Apply a SPARQL BIND clause
 * @see https://www.w3.org/TR/sparql11-query/#bind
 * @extends TransformIterator
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
class BindOperator extends TransformIterator {
  constructor (source, variable, expression, options) {
    super(source, options)
    this._variable = variable
    this._expression = new SPARQLExpression(expression)
  }

  _transform (bindings, done) {
    try {
      bindings[this._variable] = this._expression.evaluate(bindings).asRDF
    } catch (e) {
      this.emit('error', e)
    }
    this._push(bindings)
    done()
  }
}

module.exports = BindOperator
