/* file : service-executor.js
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

/**
 * A ServiceExecutor is responsible for evaluation a SERVICE clause in a SPARQL query.
 * @abstract
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
class ServiceExecutor {
  constructor (dataset) {
    this._dataset = dataset
  }

  /**
   * Build an iterator to evaluate a SERVICE clause
   * @private
   * @param  {AsyncIterator}  source  - Source iterator
   * @param  {Object}         node    - Service clause
   * @param  {Object}         options - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a a GRAPH/SERVICE clause
   */
  buildIterator (source, node, options) {
    let subquery
    if (node.patterns[0].type === 'query') {
      subquery = node.patterns[0]
    } else {
      subquery = {
        prefixes: options.prefixes,
        queryType: 'SELECT',
        variables: ['*'],
        type: 'query',
        where: node.patterns
      }
    }
    const graph = (node.name === 'DEFAULT') ? this._dataset.getDefaultGraph() : this._dataset.getNamedGraph(node.name)
    return this._execute(source, graph, subquery, options)
  }

  /**
   * Returns an iterator used to evaluate a GRAPH/SERVICE clause
   * @param  {AsyncIterator}  source    - Source iterator
   * @param  {*}              graph       - Graph used to evaluate the subquery
   * @param  {Object}         subquery  - Subquery to be evaluated
   * @param  {Object}         options   - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a a GRAPH/SERVICE clause
   */
  _execute (source, graph, subquery, options) {
    throw new Error('A valid ServiceExecutor must implements an "execute" method')
  }
}

module.exports = ServiceExecutor
