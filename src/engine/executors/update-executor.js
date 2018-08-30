/* file : update-executor.js
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

const { single } = require('asynciterator')
const InsertConsumer = require('../../operators/update/insert-consumer.js')
const DeleteConsumer = require('../../operators/update/delete-consumer.js')
const ClearConsumer = require('../../operators/update/clear-consumer.js')
const ManyConsumers = require('../../operators/update/many-consumers.js')
const ConstructOperator = require('../../operators/modifiers/construct-operator.js')
const rewritings = require('./rewritings.js')

/**
 * An UpdateExecutor is an executor responsible for evaluating SPARQL UPDATE queries.
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321
 * @author Thomas Minier
 */
class UpdateExecutor {
  constructor (dataset, builder) {
    this._dataset = dataset
    this._builder = builder
  }

  execute (updates, options) {
    let queries
    return new ManyConsumers(updates.map(update => {
      switch (update.updateType) {
        case 'insert':
        case 'delete':
        case 'insertdelete':
          return this._handleInsertDelete(update, options)
        default:
          break
      }
      switch (update.type) {
        case 'clear':
          return this._handleClearQuery(update, options)
        case 'add':
          return this._handleInsertDelete(rewritings.rewriteAdd(update, this._dataset), options)
        case 'copy':
          // A COPY query is rewritten into a sequence [CLEAR query, INSERT query]
          queries = rewritings.rewriteCopy(update, this._dataset)
          return new ManyConsumers([
            this._handleClearQuery(queries[0], options),
            this._handleInsertDelete(queries[1], options)
          ])
        case 'move':
          // A MOVE query is rewritten into a sequence [CLEAR query, INSERT query, CLEAR query]
          queries = rewritings.rewriteMove(update, this._dataset)
          return new ManyConsumers([
            this._handleClearQuery(queries[0], options),
            this._handleInsertDelete(queries[1], options),
            this._handleClearQuery(queries[2], options)
          ])
        default:
          throw new SyntaxError(`Unsupported SPARQL UPDATE query: ${update.type}`)
      }
    }))
  }

  /**
   * Build a Consumer to evaluate SPARQL UPDATE queries
   * @param  {Object} update  - Parsed query
   * @param  {Object} options - Execution options
   * @return {Object} A Consumer used to evaluate SPARQL UPDATE queries
   */
  _handleInsertDelete (update, options) {
    let source = single({})
    let graph = null
    let deletes = []
    let inserts = []

    if (update.updateType === 'insertdelete') {
      graph = ('graph' in update) ? this._dataset.getNamedGraph(update.graph) : null
      // evaluate the WHERE clause as a classic SELECT query
      source = this._builder.build({
        type: 'query',
        where: update.where,
        queryType: 'SELECT',
        variables: ['*'],
        // copy the FROM clause from the original UPDATE query
        from: ('from' in update) ? update.from : undefined
      })
    }

    // build consumers to evaluate DELETE clauses
    if ('delete' in update && update.delete.length > 0) {
      deletes = update.delete.map(v => {
        return this._buildDeleteConsumer(source.clone(), v, graph)
      })
    }

    // build consumers to evaluate INSERT clauses
    if ('insert' in update && update.insert.length > 0) {
      inserts = update.insert.map(v => {
        return this._buildInsertConsumer(source.clone(), v, graph)
      })
    }
    return new ManyConsumers(deletes.concat(inserts))
  }

  /**
   * Build a consumer to evaluate a SPARQL INSERT clause
   * @param  {AsyncIterator} source - Source iterator
   * @param  {Object}        group - parsed SPARQL INSERT clause
   * @param  {Graph}         [graph=null] - RDF Graph used to insert data
   * @return {AsyncIterator} A consumer used to evaluate a SPARQL INSERT clause
   */
  _buildInsertConsumer (source, group, graph = null) {
    source = new ConstructOperator(source, {template: group.triples})
    if (graph === null) {
      graph = (group.type === 'graph') ? this._dataset.getNamedGraph(group.name) : this._dataset.getDefaultGraph()
    }
    return new InsertConsumer(source, graph)
  }

  /**
   * Build a consumer to evaluate a SPARQL DELETE clause
   * @param  {AsyncIterator} source - Source iterator
   * @param  {Object}        group - parsed SPARQL DELETE clause
   * @param  {Graph}         [graph=null] - RDF Graph used to delete data
   * @return {AsyncIterator} A consumer used to evaluate a SPARQL DELETE clause
   */
  _buildDeleteConsumer (source, group, graph = null) {
    source = new ConstructOperator(source, {template: group.triples})
    if (graph === null) {
      graph = (group.type === 'graph') ? this._dataset.getNamedGraph(group.name) : this._dataset.getDefaultGraph()
    }
    return new DeleteConsumer(source, graph)
  }

  /**
   * Build a Consumer to evaluate CLEAR queries
   * @param  {Object} query - Parsed query
   * @return {Consumer} A Consumer used to evaluate CLEAR queries
   */
  _handleClearQuery (query) {
    let graph = null
    const iris = this._dataset.iris
    if (query.graph.default) {
      graph = this._dataset.getDefaultGraph()
    } else if (query.graph.all) {
      graph = this._dataset.getUnionGraph(iris, true)
    } else if (query.graph.named) {
      graph = this._dataset.getUnionGraph(iris, false)
    } else {
      graph = this._dataset.getNamedGraph(query.graph.name)
    }
    return new ClearConsumer(graph)
  }
}

module.exports = UpdateExecutor
