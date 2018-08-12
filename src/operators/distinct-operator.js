/* file : distinct-operator.js
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
const map = require('lodash/map')

/**
 * DistinctOperator applies a DISTINCT modifier on the output of another operator.
 * @extends TransformIterator
 * @memberof Operators
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modDuplicates}
 */
class DistinctOperator extends TransformIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source - The source operator
   */
  constructor (source) {
    super(source)
    this._values = new Map()
  }

  /**
   * Filter unique mappings from the source operator
   * @param {Object} item - The set of mappings to filter
   * @param {function} done - To be called when filtering is done
   * @return {void}
   */
  _transform (item, done) {
    const hash = this._hash(item)
    if (!this._values.has(hash)) {
      this._values.set(hash, 1)
      this._push(item)
    }
    done()
  }

  /**
   * Hash an item and produce an unique value
   * @param {Object} item - The item to hash
   * @return {string} An unique hash which identify the item
   */
  _hash (item) {
    return map(item, (v, k) => `${k}=${encodeURIComponent(v)}`).sort().join('&')
  }
}

module.exports = DistinctOperator
