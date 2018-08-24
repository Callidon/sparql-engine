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
const ManyConsumers = require('../../operators/update/many-consumers.js')
const ConstructOperator = require('../../operators/modifiers/construct-operator.js')

/**
 * An UpdateExecutor is an executor responsible for evaluating SPARQL UPDATE queries.
 * @abstract
 * @author Thomas Minier
 */
class UpdateExecutor {
  constructor (dataset, builder) {
    this._dataset = dataset
    this._builder = builder
  }

  execute (updates, options) {
    return new ManyConsumers(updates.map(update => {
      return this._buildConsumer(update, options)
    }))
  }

  _buildConsumer (update, options) {
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

  _buildInsertConsumer (source, group, graph = null) {
    source = new ConstructOperator(source, {template: group.triples})
    if (graph === null) {
      graph = (group.type === 'graph') ? this._dataset.getNamedGraph(group.name) : this._dataset.getDefaultGraph()
    }
    return new InsertConsumer(source, graph)
  }

  _buildDeleteConsumer (source, group, graph = null) {
    source = new ConstructOperator(source, {template: group.triples})
    if (graph === null) {
      graph = (group.type === 'graph') ? this._dataset.getNamedGraph(group.name) : this._dataset.getDefaultGraph()
    }
    return new DeleteConsumer(source, graph)
  }
}

module.exports = UpdateExecutor
