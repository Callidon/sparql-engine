/* file : update-executor.ts
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

import { AsyncIterator, single } from 'asynciterator'
import { Consumable, ErrorConsumable } from '../../operators/update/consumer'
import InsertConsumer from '../../operators/update/insert-consumer'
import DeleteConsumer from '../../operators/update/delete-consumer'
import ClearConsumer from '../../operators/update/clear-consumer'
import ManyConsumers from '../../operators/update/many-consumers'
import ConstructOperator from '../../operators/modifiers/construct-operator'
import * as rewritings from './rewritings.js'
import Graph from '../../rdf/graph'
import Dataset from '../../rdf/dataset'
import { Algebra } from 'sparqljs'
import { Bindings, BindingBase } from '../../rdf/bindings'

/**
 * An UpdateExecutor is an executor responsible for evaluating SPARQL UPDATE queries.
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321
 * @author Thomas Minier
 */
export default class UpdateExecutor {
  readonly _dataset: Dataset
  readonly _builder: any
  constructor (dataset: Dataset, builder: any) {
    this._dataset = dataset
    this._builder = builder
  }

  execute (updates: Array<Algebra.UpdateQueryNode | Algebra.UpdateClearNode | Algebra.UpdateCopyMoveNode>, options: Object): Consumable {
    let queries
    return new ManyConsumers(updates.map(update => {
      if ('updateType' in update) {
        switch (update.updateType) {
          case 'insert':
          case 'delete':
          case 'insertdelete':
            return this._handleInsertDelete(<Algebra.UpdateQueryNode> update, options)
          default:
            return new ErrorConsumable(`Unsupported SPARQL UPDATE query: ${update.updateType}`)
        }
      } else if ('type' in update) {
        switch (update.type) {
          case 'clear':
            return this._handleClearQuery(<Algebra.UpdateClearNode> update)
          case 'add':
            return this._handleInsertDelete(rewritings.rewriteAdd(<Algebra.UpdateCopyMoveNode> update, this._dataset), options)
          case 'copy':
            // A COPY query is rewritten into a sequence [CLEAR query, INSERT query]
            queries = rewritings.rewriteCopy(<Algebra.UpdateCopyMoveNode> update, this._dataset)
            return new ManyConsumers([
              this._handleClearQuery(queries[0]),
              this._handleInsertDelete(queries[1], options)
            ])
          case 'move':
            // A MOVE query is rewritten into a sequence [CLEAR query, INSERT query, CLEAR query]
            queries = rewritings.rewriteMove(<Algebra.UpdateCopyMoveNode> update, this._dataset)
            return new ManyConsumers([
              this._handleClearQuery(queries[0]),
              this._handleInsertDelete(queries[1], options),
              this._handleClearQuery(queries[2])
            ])
          default:
            return new ErrorConsumable(`Unsupported SPARQL UPDATE query: ${update.type}`)
        }
      }
      return new ErrorConsumable(`Unsupported SPARQL UPDATE query: ${update}`)
    }))
  }

  /**
   * Build a Consumer to evaluate SPARQL UPDATE queries
   * @param  {Object} update  - Parsed query
   * @param  {Object} options - Execution options
   * @return {Object} A Consumer used to evaluate SPARQL UPDATE queries
   */
  _handleInsertDelete (update: Algebra.UpdateQueryNode, options: Object): Consumable {
    let source = single(new BindingBase())
    let graph: Graph | null = null
    let deletes: DeleteConsumer[] = []
    let inserts: InsertConsumer[] = []

    if (update.updateType === 'insertdelete') {
      graph = ('graph' in update) ? this._dataset.getNamedGraph(update.graph!) : null
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
    if ('delete' in update && update.delete!.length > 0) {
      deletes = update.delete!.map(v => {
        return this._buildDeleteConsumer(source.clone(), v, graph, options)
      })
    }

    // build consumers to evaluate INSERT clauses
    if ('insert' in update && update.insert!.length > 0) {
      inserts = update.insert!.map(v => {
        return this._buildInsertConsumer(source.clone(), v, graph, options)
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
  _buildInsertConsumer (source: AsyncIterator<Bindings>, group: Algebra.BGPNode | Algebra.UpdateGraphNode, graph: Graph | null, options: Object): InsertConsumer {
    const tripleSource = new ConstructOperator(source, {template: group.triples})
    if (graph === null) {
      graph = (group.type === 'graph' && 'name' in group) ? this._dataset.getNamedGraph(group.name) : this._dataset.getDefaultGraph()
    }
    return new InsertConsumer(tripleSource, graph, options)
  }

  /**
   * Build a consumer to evaluate a SPARQL DELETE clause
   * @param  {AsyncIterator} source - Source iterator
   * @param  {Object}        group - parsed SPARQL DELETE clause
   * @param  {Graph}         [graph=null] - RDF Graph used to delete data
   * @return {AsyncIterator} A consumer used to evaluate a SPARQL DELETE clause
   */
  _buildDeleteConsumer (source: AsyncIterator<Bindings>, group: Algebra.BGPNode | Algebra.UpdateGraphNode, graph: Graph | null, options: Object): DeleteConsumer {
    const tripleSource = new ConstructOperator(source, {template: group.triples})
    if (graph === null) {
      graph = (group.type === 'graph' && 'name' in group) ? this._dataset.getNamedGraph(group.name) : this._dataset.getDefaultGraph()
    }
    return new DeleteConsumer(tripleSource, graph, options)
  }

  /**
   * Build a Consumer to evaluate CLEAR queries
   * @param  {Object} query - Parsed query
   * @return {Consumer} A Consumer used to evaluate CLEAR queries
   */
  _handleClearQuery (query: Algebra.UpdateClearNode): ClearConsumer {
    let graph = null
    const iris = this._dataset.iris
    if (query.graph.default) {
      graph = this._dataset.getDefaultGraph()
    } else if (query.graph.all) {
      graph = this._dataset.getUnionGraph(iris, true)
    } else if (query.graph.named) {
      graph = this._dataset.getUnionGraph(iris, false)
    } else {
      graph = this._dataset.getNamedGraph(query.graph.name!)
    }
    return new ClearConsumer(graph)
  }
}
