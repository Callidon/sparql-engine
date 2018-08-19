/* file : groupby-operator.js
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

const MaterializeOperator = require('../materialize-operator.js')
const { groupBy, map } = require('lodash')

/**
 * Apply a SPARQL GROUP BY clause
 * @see https://www.w3.org/TR/sparql11-query/#groupby
 * @extends MaterializeOperator
 * @author Thomas Minier
 */
class GroupByOperator extends MaterializeOperator {
  constructor (source, variable, options) {
    super(source)
    this._variable = variable
    this._options = options
  }

  _transformAll (values) {
    let groups = groupBy(values, bindings => {
      return bindings[this._variable]
    })
    groups = map(groups, (values, key) => {
      const b = { '__aggregate': values }
      b[this._variable] = key
      return b
    })
    return groups
  }
}

module.exports = GroupByOperator
