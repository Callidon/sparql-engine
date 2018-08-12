/* file : bgp-executor.js
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

const AsyncIterator = require('asynciterator')

/**
 * A BGPExecutor is responsible for evaluation BGP in a SPARQL query.
 * It is the main extension point of the SPARQL engine.
 * @abstract
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
class BGPExecutor {
  /**
   * Returns True if the input iterator if the starting iterator in a pipeline
   * @private
   * @param  {AsyncIterator} source - Source Iterator
   * @return {Boolean} True if the input iterator if the starting iterator in a pipeline, False otherwise
   */
  _isJoinIdentity (source) {
    let isJoinIdentity = false
    let typeFound = false
    let tested = source
    while (!typeFound) {
      if (tested instanceof AsyncIterator.ClonedIterator) {
        if (tested._source != null) {
          tested = tested._source
        } else {
          isJoinIdentity = true
          typeFound = true
        }
      } else if (tested instanceof AsyncIterator.SingletonIterator) {
        isJoinIdentity = true
        typeFound = true
      } else {
        typeFound = true
      }
    }
    return isJoinIdentity
  }

  /**
   * Build an iterator to evaluate a BGP
   * @private
   * @param  {AsyncIterator}  source  - Source iterator
   * @param  {Object[]}  patterns     - Set of triple patterns
   * @param  {Object}  options        - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a Basic Graph pattern
   */
  _buildIterator (source, patterns, options) {
    return this.execute(source, patterns, options, this._isJoinIdentity(source))
  }

  /**
   * Returns an iterator used to evaluate a Basic Graph pattern
   * @param  {AsyncIterator}  source  - Source iterator
   * @param  {Object[]}  patterns     - Set of triple patterns
   * @param  {Object}  options        - Execution options
   * @param  {Boolean} isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
   * @return {AsyncIterator} An iterator used to evaluate a Basic Graph pattern
   */
  execute (source, patterns, options, isJoinIdentity) {
    throw new Error('A valid BGPExecutor must implements an "execute" method')
  }
}

module.exports = BGPExecutor
