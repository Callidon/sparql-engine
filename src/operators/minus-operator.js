/* file : minus-operator.js
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

const { single } = require('asynciterator')
const MaterializeOperator = require('./materialize-operator.js')
const { keys, intersection } = require('lodash')

/**
 * Evaluates a SPARQL MINUS clause
 * @see https://www.w3.org/TR/sparql11-query/#neg-minus
 * @extends MaterializeOperator
 * @author Thomas Minier
 */
class MinusOperator extends MaterializeOperator {
  constructor (source, groups, builder, options) {
    super(source, options)
    this._groups = groups
    this._builder = builder
    this._options = options
  }

  _transform (bindings, done) {
    let isCompatible = false
    const leftKeys = keys(bindings)
    const source = single({})
    const iterator = this._builder._buildWhere(source, this._groups, this._options)
    iterator.on('error', err => {
      this.emit('error', err)
    })
    iterator.on('end', () => {
      if (!isCompatible) {
        this._push(bindings)
        done()
      } else {
        done(true)
      }
    })
    iterator.on('data', b => {
      const rightKeys = keys(b)
      const commonKeys = intersection(leftKeys, rightKeys)
      isCompatible = isCompatible || commonKeys.every(k => b[k] === bindings[k])
    })
  }
}

module.exports = MinusOperator
