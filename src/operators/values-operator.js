/* file : values-operator.js
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
 * @extends TransformIterator
 * @memberof Operators
 * @author Corentin Marionneau
 */
class ValuesOperator extends TransformIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source - The source iterator
   * @param {string[]} variables - The variables of the values
   */
  constructor (source, variables, options) {
    super(source)
    this._variables = variables
    this._options = options
    source.on('error', err => this.emit('error', err))
  }

  /**
   * Transform mappings from the source iterator using the values
   * @param {Object} item - The set of mappings on which we apply the projection
   * @param {function} done - To be called when projection is done
   * @return {void}
   */
  _transform (mappings, done) {
    for (var variable in this._variables) {
      mappings[variable] = this._variables[variable]
    }
    this._push(mappings)
    done()
  }
}

module.exports = ValuesOperator
