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

const { ClonedIterator, MultiTransformIterator, SingletonIterator } = require('asynciterator')
const { applyBindings } = require('../../utils.js')
const { assign, some, size } = require('lodash')

/**
 * Basic iterator used to evaluate Basic graph patterns using the "evalBGP" method
 * available
 * @extends MultiTransformIterator
 */
class BaseBGPIterator extends MultiTransformIterator {
  constructor (source, bgp, graph, options) {
    super(source, options)
    this._bgp = bgp
    this._graph = graph
    this._options = options
  }

  _createTransformer (bindings) {
    // bound the BGP using incoming bindings, then delegate execution to the dataset
    let boundedBGP = this._bgp.map(t => applyBindings(t, bindings))
    const hasVars = boundedBGP.map(p => some(p, v => v.startsWith('?')))
      .reduce((acc, v) => acc && v, true)
    return this._graph.evalBGP(boundedBGP, this._options)
      .map(item => {
        if (size(item) === 0 && hasVars) return null
        return assign(item, bindings)
      })
  }
}

/**
 * A BGPExecutor is responsible for evaluation BGP in a SPARQL query.
 * Users can extend this class and overrides the "_execute" method to customize BGP evaluation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
class BGPExecutor {
  constructor (dataset) {
    this._dataset = dataset
  }

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
      if (tested instanceof ClonedIterator) {
        if (tested._source != null) {
          tested = tested._source
        } else {
          isJoinIdentity = true
          typeFound = true
        }
      } else if (tested instanceof SingletonIterator) {
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
   * @param  {AsyncIterator}  source    - Source iterator
   * @param  {Object[]}       patterns  - Set of triple patterns
   * @param  {Object}         options   - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a Basic Graph pattern
   */
  buildIterator (source, patterns, options) {
    // select the graph to use for BGP evaluation
    let graph = this._dataset.getDefaultGraph()
    if ('_graph' in options) {
      graph = this._dataset.getNamedGraph(options._graph)
    }
    return this._execute(source, graph, patterns, options, this._isJoinIdentity(source))
  }

  /**
   * Returns an iterator used to evaluate a Basic Graph pattern
   * @param  {AsyncIterator}  source         - Source iterator
   * @param  {Graph}          graph          - The graph on which the BGP should be executed
   * @param  {Object[]}       patterns       - Set of triple patterns
   * @param  {Object}         options        - Execution options
   * @param  {Boolean}        isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
   * @return {AsyncIterator} An iterator used to evaluate a Basic Graph pattern
   */
  _execute (source, graph, patterns, options, isJoinIdentity) {
    return new BaseBGPIterator(source, patterns, graph, options)
  }
}

module.exports = BGPExecutor
