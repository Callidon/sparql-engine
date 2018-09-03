/* file : exists-operator.js
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

const { single, TransformIterator } = require('asynciterator')

/**
 * Evaluates a SPARQL FILTER (NOT) EXISTS clause
 * @extends TransformIterator
 * @author Thomas Minier
 */
class ExistsOperator extends TransformIterator {
  /**
   * Constructor
   * @param {AsyncIterator} source    - Source iterator
   * @param {Object[]}      groups    - Content of the FILTER clause
   * @param {PlanBuilder}   builder   - Plan builder used to evaluate subqueries
   * @param {boolean}       notexists - True if the filter is NOT EXISTS, False otherwise
   * @param {Object}        options   - Execution options
   */
  constructor (source, groups, builder, notexists, options) {
    super(source, options)
    this._groups = groups
    this._builder = builder
    this._options = options
    this._notexists = notexists
    source.on('error', err => this.emit('error', err))
  }

  _transform (bindings, done) {
    let exists = false
    // build an iterator to evaluate the EXISTS clause using the set of bindings
    // using a LIMIT 1, to minimize the evaluation cost
    const iterator = this._builder._buildWhere(single(bindings), this._groups, this._options).take(1)
    iterator.on('error', err => this.emit('error', err))
    iterator.on('end', () => {
      if (exists && (!this._notexists)) {
        // EXISTS case
        this._push(bindings)
      } else if ((!exists) && this._notexists) {
        // NOT EXISTS case
        this._push(bindings)
      }
      done()
    })
    iterator.on('data', () => {
      exists = true
    })
  }
}

module.exports = ExistsOperator
