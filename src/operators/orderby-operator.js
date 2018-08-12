/* file : orderby-operator.js
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

const { BufferedIterator } = require('asynciterator')
const { sortBy } = require('lodash')

/**
 * A OrderByOperator implements a ORDER BY clause, i.e.,
 * it sorts solution mappings produced by another operator
 * @extends BufferedIterator
 * @memberof Operators
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modOrderBy}
 */
class OrderByOperator extends BufferedIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source - The source operator
   * @param {string[]} variables - List of variables to sort by
   */
  constructor (source, variables, descending = false) {
    super()
    this._variables = variables
    this._bufferedValues = []
    this._readingFromSource = false
    this._isSorted = false
    this._descending = false
    this._source = source
  }

  /**
   * _read implementation: buffer all values in memory, sort them
   * and then, ouput them.
   * @private
   * @return {void}
   */
  _read (count, done) {
    if (!this._readingFromSource) {
      this._readingFromSource = true
      this._source.on('data', d => this._bufferedValues.push(d))
      this._source.on('end', () => {
        this._bufferedValues = sortBy(this._bufferedValues, this._variables)
        this._isSorted = true
        this._read(count, done)
      })
    } else {
      if (this._isSorted && this._bufferedValues.length === 0) {
        this.close()
      } else if (this._isSorted) {
        if (this._descending) {
          this._push(this._bufferedValues.pop())
        } else {
          this._push(this._bufferedValues.shift())
        }
      }
      done()
    }
  }
}

module.exports = OrderByOperator
