/* file : triple-operator.js
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

const { MultiTransformIterator } = require('asynciterator')
const { applyBindings, rdf } = require('../utils.js')
const { assign, mapKeys, pickBy, some, size } = require('lodash')

class TripleOperator extends MultiTransformIterator {
  constructor (source, pattern, graph, options) {
    super(source, options)
    this._pattern = pattern
    this._graph = graph
    this._options = options
  }

  _createTransformer (bindings) {
    const boundedPattern = applyBindings(this._pattern, bindings)
    const hasVars = some(boundedPattern, v => v.startsWith('?'))
    return this._graph.find(boundedPattern, this._options)
      .map(item => {
        item = pickBy(item, (v, k) => {
          return rdf.isVariable(boundedPattern[k])
        })
        item = mapKeys(item, (v, k) => {
          return boundedPattern[k]
        })
        if (size(item) === 0 && hasVars) return null
        return assign(item, bindings)
      })
  }
}

module.exports = TripleOperator
