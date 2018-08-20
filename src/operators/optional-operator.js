/* file : optional-iterator.js
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

const { TransformIterator } = require('asyncIterator')

/**
 * Handles an SPARQL OPTIONAL clause in the following way:
 * 1) Buffer every bindings produced by the source iterator.
 * 2) Set a flag to False if the OPTIONAL clause yield at least one set of bindings.
 * 3) When the OPTIONAL clause if evaluated, check if the flag is True.
 * 4) If the flag is True, then we output all buffered values. Otherwise, we do nothing.
 * @see https://www.w3.org/TR/sparql11-query/#optionals
 * @extends TransformIterator
 * @author Thomas Minier
 */
class OptionalOperator extends TransformIterator {
  constructor (source, patterns, builder, options) {
    // set a spy on the sourcr iterator to buffer bindings
    let iter = source.map(v => {
      this._registerValue(v)
      return v
    })
    // build a pipeline of iterators to evaluates the OPTIONAL
    iter = builder._buildWhere(iter, patterns, options)
    super(iter)
    this._bufferedvalues = []
    this._emptySource = true
  }

  _registerValue (v) {
    this._bufferedvalues.push(v)
  }

  _transform (bindings, done) {
    this._emptySource = false
    this._push(bindings)
    done()
  }

  _flush (done) {
    if (this._emptySource) {
      this._bufferedvalues.forEach(v => {
        this._push(v)
      })
    }
    done()
  }
}

module.exports = OptionalOperator
