/* file : select-iterator.js
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
 * Select some properties of an Object and returns a new Object.
 * @private
 * @param  {Object} obj    - The Object in which select properties
 * @param  {string[]} fields - The properties to select
 * @return {Object} A new Object with the selected properties
 * @author Thomas Minier
 */
function pick (obj, properties) {
  const newObj = {}
  properties.forEach(p => {
    if (p in obj) {
      newObj[p] = obj[p]
    }
  })
  return newObj
}

/**
 * ProjectionOperator applies a SELECT operation (i.e. a projection) on the output of another iterator
 * @extends TransformIterator
 * @memberof Operators
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modProjection}
 */
class ProjectionOperator extends TransformIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source - The source iterator
   * @param {string[]} variables - The variables of the projection
   */
  constructor (source, variables, spy = null) {
    super(source)
    this._variables = variables
    this._selectAll = this._variables[0] === '*'
    this._spy = spy
    source.on('error', err => this.emit('error', err))
  }

  /**
   * Transform mappings from the source iterator using the projection
   * @param {Object} item - The set of mappings on which we apply the projection
   * @param {function} done - To be called when projection is done
   * @return {void}
   */
  _transform (mappings, done) {
    if (this._selectAll) {
      this._push(mappings)
    } else {
      this._push(pick(mappings, this._variables))
    }
    if (this._spy !== null) this._spy.reportSolution()
    done()
  }
}

module.exports = ProjectionOperator
