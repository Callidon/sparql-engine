/* file : graph-executor.js
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

const UnionOperator = require('../../operators/union-operator.js')
const { extendByBindings, rdf } = require('../../utils.js')
const { cloneDeep } = require('lodash')

/**
 * A GraphExecutor is responsible for evaluation a GRAPH clause in a SPARQL query.
 * @abstract
 * @author Thomas Minier
 */
class GraphExecutor {
  constructor (dataset, builder) {
    this._dataset = dataset
    this._builder = builder
  }

  /**
   * Build an iterator to evaluate a GRAPH clause
   * @private
   * @param  {AsyncIterator}  source  - Source iterator
   * @param  {Object}         node    - Graph clause
   * @param  {Object}         options - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a GRAPH clause
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
    // handle the case where the GRAPh IRI is a SPARQL variable
    if (rdf.isVariable(node.name)) {
      // execute the subquery using each graph, and bound the graph var to the graph iri
      const iterators = this._dataset.getAllGraphs().map(g => {
        const bindings = {}
        bindings[node.name] = g.iri
        return extendByBindings(this._execute(source.clone(), g, subquery, options), bindings)
      })
      return new UnionOperator(...iterators)
    }
    // otherwise, execute the subquery using the Graph
    return this._execute(source, node.name, subquery, options)
  }

  /**
   * Returns an iterator used to evaluate a GRAPH clause
   * @param  {AsyncIterator}  source    - Source iterator
   * @param  {string}         iri       - IRI of the GRAPH clause
   * @param  {Object}         subquery  - Subquery to be evaluated
   * @param  {Object}         options   - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a GRAPH clause
   */
  _execute (source, graph, subquery, options) {
    const opts = cloneDeep(options)
    opts._graph = graph
    return this._builder.build(subquery, options, source)
  }
}

module.exports = GraphExecutor
