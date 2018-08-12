/* file : formatter.js
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

/**
 * @fileOverview This module contains results formatters
 * @module Formatters
 */

/**
 * A Formatter format solution bindings into the specified format
 * @extends TransformIterator
 * @abstract
 * @memberof Formatters
 * @author Thomas Minier
 */
class Formatter extends TransformIterator {
  /**
   * Constructor
   * @memberof Formatters
   * @param {AsyncIterator} source - Source iterator
   */
  constructor (source) {
    super(source)
    this._nbBindings = 0
  }

  get cardinality () {
    return this._nbBindings
  }

  /**
   * Implements this function to prepend data to the formatter before the first
   * set of solution bindings is processed.
   * @abstract
   * @return {*} Data to prepend
   */
  _prepend () {
    return null
  }

  /**
   * Implements this function to append data to the formatter after the last
   * set of solution bindings is processed.
   * @abstract
   * @return {*} Data to append
   */
  _append () {
    return null
  }

  /**
   * @private
   * @param  {Function} done
   * @return {void}
   */
  _begin (done) {
    super._begin(() => {
      const startItem = this._prepend()
      if (startItem !== null) {
        this._push(startItem)
      }
      done()
    })
  }

  _flush (done) {
    const endItem = this._append()
    if (endItem !== null) {
      this._push(endItem)
    }
    done()
  }

  /**
   * Format bindings
   * @abstract
   * @param  {Object} bindings - Bag of solution bindings to format
   * @return {void}
   */
  _format (bindings) {
    return bindings.toString()
  }

  _transform (bindings, done) {
    this._nbBindings++
    this._push(this._format(bindings))
    done()
  }
}

module.exports = Formatter
