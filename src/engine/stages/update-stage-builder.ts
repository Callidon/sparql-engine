/* file : update-stage-builder.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

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

import * as SPARQL from 'sparqljs'
import construct from '../../operators/modifiers/construct.js'
import ActionConsumer from '../../operators/update/action-consumer.js'
import ClearConsumer from '../../operators/update/clear-consumer.js'
import { Consumable, ErrorConsumable } from '../../operators/update/consumer.js'
import DeleteConsumer from '../../operators/update/delete-consumer.js'
import InsertConsumer from '../../operators/update/insert-consumer.js'
import ManyConsumers from '../../operators/update/many-consumers.js'
import NoopConsumer from '../../operators/update/nop-consumer.js'
import { BindingBase, Bindings } from '../../rdf/bindings.js'
import Graph from '../../rdf/graph.js'
import { rdf } from '../../utils.js'
import ExecutionContext from '../context/execution-context.js'
import ContextSymbols from '../context/symbols.js'
import { PipelineStage } from '../pipeline/pipeline-engine.js'
import { Pipeline } from '../pipeline/pipeline.js'
import { QueryOutput } from '../plan-builder.js'
import * as rewritings from './rewritings.js'
import StageBuilder from './stage-builder.js'
/**
 * An UpdateStageBuilder evaluates SPARQL UPDATE queries.
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321
 * @author Thomas Minier
 */
export default class UpdateStageBuilder extends StageBuilder {
  /**
   * Create a {@link Consumable} used to evaluate a SPARQL 1.1 Update query
   * @param updates - Set of Update queries to execute
   * @param options - Execution options
   * @return A Consumable used to evaluatethe set of update queries
   */
  execute(updates: Array<SPARQL.UpdateOperation>, context: ExecutionContext): Consumable {
    let queries
    return new ManyConsumers(updates.map(update => {
      if ('updateType' in update) {
        switch (update.updateType) {
          case 'insert':
          case 'delete':
          case 'insertdelete':
            return this._handleInsertDelete(update, context)
          default:
            return new ErrorConsumable(`Unsupported SPARQL UPDATE query: ${update.updateType}`)
        }
      } else if ('type' in update) {
        switch (update.type) {
          case 'create': {
            const createNode = update as SPARQL.CreateOperation
            const iri = createNode.graph.name!
            if (this._dataset.hasNamedGraph(iri)) {
              if (!createNode.silent) {
                return new ErrorConsumable(`Cannot create the Graph with iri ${iri} as it already exists in the RDF dataset`)
              }
              return new NoopConsumer()
            }
            return new ActionConsumer(() => {
              this._dataset.addNamedGraph(iri, this._dataset.createGraph(iri))
            })
          }
          case 'drop': {
            const dropNode = update as SPARQL.ClearDropOperation
            // handle DROP DEFAULT queries
            if ('default' in dropNode.graph && dropNode.graph.default) {
              return new ActionConsumer(() => {
                const defaultGraphIRI = this._dataset.getDefaultGraph().iri
                if (this._dataset.iris.length < 1) {
                  return new ErrorConsumable(`Cannot drop the default Graph with iri ${iri} as it would leaves the RDF dataset empty without a default graph`)
                }
                const newDefaultGraphIRI = this._dataset.iris.find(iri => iri !== defaultGraphIRI)!
                this._dataset.setDefaultGraph(this._dataset.getNamedGraph(newDefaultGraphIRI))
              })
            }
            // handle DROP ALL queries
            if ('all' in dropNode.graph && dropNode.graph.all) {
              return new ActionConsumer(() => {
                this._dataset.iris.forEach(iri => this._dataset.deleteNamedGraph(iri))
              })
            }
            // handle DROP GRAPH queries
            const iri = dropNode.graph.name!
            if (!this._dataset.hasNamedGraph(iri)) {
              if (!dropNode.silent) {
                return new ErrorConsumable(`Cannot drop the Graph with iri ${iri} as it doesn't exists in the RDF dataset`)
              }
              return new NoopConsumer()
            }
            return new ActionConsumer(() => {
              this._dataset.deleteNamedGraph(iri)
            })
          }
          case 'clear':
            return this._handleClearQuery(update as SPARQL.ClearDropOperation)
          case 'add':
            return this._handleInsertDelete(rewritings.rewriteAdd(update as SPARQL.CopyMoveAddOperation, this._dataset), context)
          case 'copy':
            // A COPY query is rewritten into a sequence [CLEAR query, INSERT query]
            queries = rewritings.rewriteCopy(update as SPARQL.CopyMoveAddOperation, this._dataset)
            return new ManyConsumers([
              this._handleClearQuery(queries[0]),
              this._handleInsertDelete(queries[1], context)
            ])
          case 'move':
            // A MOVE query is rewritten into a sequence [CLEAR query, INSERT query, CLEAR query]
            queries = rewritings.rewriteMove(update as SPARQL.CopyMoveAddOperation, this._dataset)
            return new ManyConsumers([
              this._handleClearQuery(queries[0]),
              this._handleInsertDelete(queries[1], context),
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
   * @private
   * @param update  - Parsed query
   * @param options - Execution options
   * @return A Consumer used to evaluate SPARQL UPDATE queries
   */
  _handleInsertDelete(update: SPARQL.InsertDeleteOperation, context: ExecutionContext): Consumable {
    const engine = Pipeline.getInstance()
    let source: PipelineStage<QueryOutput> = engine.of(new BindingBase())
    let graph: Graph | null = null
    let consumables: Consumable[] = []

    if (update.updateType === 'insertdelete') {
      graph = ('graph' in update) ? this._dataset.getNamedGraph(update.graph!.name!) : null
      // evaluate the WHERE clause as a classic SELECT query
      const node: SPARQL.Query = {
        prefixes: context.getProperty(ContextSymbols.PREFIXES),
        type: 'query',
        where: update.where!,
        queryType: 'SELECT',
        variables: [new SPARQL.Wildcard()],
        // copy the USING clause from the original UPDATE query to the FROM
        from: ('using' in update) ? update.using : undefined
      }
      source = this._builder!._buildQueryPlan(node, context)
    }

    // clone the source first
    source = engine.clone(source)

    // build consumers to evaluate DELETE clauses
    if ('delete' in update && update.delete!.length > 0) {
      consumables = consumables.concat(update.delete!.map(v => {
        return this._buildDeleteConsumer(source as PipelineStage<Bindings>, v, graph, context)
      }))
    }

    // build consumers to evaluate INSERT clauses
    if ('insert' in update && update.insert!.length > 0) {
      consumables = consumables.concat(update.insert!.map(v => {
        return this._buildInsertConsumer(source as PipelineStage<Bindings>, v, graph, context)
      }))
    }
    return new ManyConsumers(consumables)
  }

  /**
   * Build a consumer to evaluate a SPARQL INSERT clause
   * @private
   * @param source - Input {@link PipelineStage}
   * @param group - parsed SPARQL INSERT clause
   * @param graph - RDF Graph used to insert data
   * @return A consumer used to evaluate a SPARQL INSERT clause
   */
  _buildInsertConsumer(source: PipelineStage<Bindings>, group: SPARQL.Quads, graph: Graph | null, context: ExecutionContext): InsertConsumer {
    const tripleSource = construct(source, { template: group.triples })
    if (graph === null) {
      graph = (group.type === 'graph' && 'name' in group) ? this._dataset.getNamedGraph(group.name as rdf.NamedNode) : this._dataset.getDefaultGraph()
    }
    return new InsertConsumer(tripleSource, graph, context)
  }

  /**
   * Build a consumer to evaluate a SPARQL DELETE clause
   * @private
   * @param  source - Input {@link PipelineStage}
   * @param  group - parsed SPARQL DELETE clause
   * @param  graph - RDF Graph used to delete data
   * @return A consumer used to evaluate a SPARQL DELETE clause
   */
  _buildDeleteConsumer(source: PipelineStage<Bindings>, group: SPARQL.Quads, graph: Graph | null, context: ExecutionContext): DeleteConsumer {
    const tripleSource = construct(source, { template: group.triples })
    if (graph === null) {
      graph = (group.type === 'graph' && 'name' in group) ? this._dataset.getNamedGraph(group.name as rdf.NamedNode) : this._dataset.getDefaultGraph()
    }
    return new DeleteConsumer(tripleSource, graph, context)
  }

  /**
   * Build a Consumer to evaluate CLEAR queries
   * @private
   * @param query - Parsed query
   * @return A Consumer used to evaluate CLEAR queries
   */
  _handleClearQuery(query: SPARQL.ClearDropOperation): ClearConsumer {
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
