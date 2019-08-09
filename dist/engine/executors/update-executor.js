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
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var executor_1 = require("./executor");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var consumer_1 = require("../../operators/update/consumer");
var insert_consumer_1 = require("../../operators/update/insert-consumer");
var delete_consumer_1 = require("../../operators/update/delete-consumer");
var clear_consumer_1 = require("../../operators/update/clear-consumer");
var many_consumers_1 = require("../../operators/update/many-consumers");
var construct_1 = require("../../operators/modifiers/construct");
var rewritings = require("./rewritings.js");
var bindings_1 = require("../../rdf/bindings");
/**
 * An UpdateExecutor is an executor responsible for evaluating SPARQL UPDATE queries.
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321
 * @author Thomas Minier
 */
var UpdateExecutor = /** @class */ (function (_super) {
    __extends(UpdateExecutor, _super);
    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    function UpdateExecutor(dataset) {
        var _this = _super.call(this) || this;
        _this._dataset = dataset;
        return _this;
    }
    /**
     * Create a {@link Consumable} used to evaluate a SPARQL 1.1 Update query
     * @param updates - Set of Update queries to execute
     * @param options - Execution options
     * @return A Consumable used to evaluatethe set of update queries
     */
    UpdateExecutor.prototype.execute = function (updates, context) {
        var _this = this;
        var queries;
        return new many_consumers_1.default(updates.map(function (update) {
            if ('updateType' in update) {
                switch (update.updateType) {
                    case 'insert':
                    case 'delete':
                    case 'insertdelete':
                        return _this._handleInsertDelete(update, context);
                    default:
                        return new consumer_1.ErrorConsumable("Unsupported SPARQL UPDATE query: " + update.updateType);
                }
            }
            else if ('type' in update) {
                switch (update.type) {
                    case 'clear':
                        return _this._handleClearQuery(update);
                    case 'add':
                        return _this._handleInsertDelete(rewritings.rewriteAdd(update, _this._dataset), context);
                    case 'copy':
                        // A COPY query is rewritten into a sequence [CLEAR query, INSERT query]
                        queries = rewritings.rewriteCopy(update, _this._dataset);
                        return new many_consumers_1.default([
                            _this._handleClearQuery(queries[0]),
                            _this._handleInsertDelete(queries[1], context)
                        ]);
                    case 'move':
                        // A MOVE query is rewritten into a sequence [CLEAR query, INSERT query, CLEAR query]
                        queries = rewritings.rewriteMove(update, _this._dataset);
                        return new many_consumers_1.default([
                            _this._handleClearQuery(queries[0]),
                            _this._handleInsertDelete(queries[1], context),
                            _this._handleClearQuery(queries[2])
                        ]);
                    default:
                        return new consumer_1.ErrorConsumable("Unsupported SPARQL UPDATE query: " + update.type);
                }
            }
            return new consumer_1.ErrorConsumable("Unsupported SPARQL UPDATE query: " + update);
        }));
    };
    /**
     * Build a Consumer to evaluate SPARQL UPDATE queries
     * @private
     * @param update  - Parsed query
     * @param options - Execution options
     * @return A Consumer used to evaluate SPARQL UPDATE queries
     */
    UpdateExecutor.prototype._handleInsertDelete = function (update, context) {
        var _this = this;
        var source = rxjs_1.of(new bindings_1.BindingBase());
        var graph = null;
        var consumables = [];
        if (update.updateType === 'insertdelete') {
            graph = ('graph' in update) ? this._dataset.getNamedGraph(update.graph) : null;
            // evaluate the WHERE clause as a classic SELECT query
            var node = {
                prefixes: context.getProperty('prefixes'),
                type: 'query',
                where: update.where,
                queryType: 'SELECT',
                variables: ['*'],
                // copy the FROM clause from the original UPDATE query
                from: ('from' in update) ? update.from : undefined
            };
            source = this._builder._buildQueryPlan(node, context);
        }
        // clone the source first
        source = source.pipe(operators_1.shareReplay(5));
        // build consumers to evaluate DELETE clauses
        if ('delete' in update && update.delete.length > 0) {
            consumables = consumables.concat(update.delete.map(function (v) {
                return _this._buildDeleteConsumer(source, v, graph, context);
            }));
        }
        // build consumers to evaluate INSERT clauses
        if ('insert' in update && update.insert.length > 0) {
            consumables = consumables.concat(update.insert.map(function (v) {
                return _this._buildInsertConsumer(source, v, graph, context);
            }));
        }
        return new many_consumers_1.default(consumables);
    };
    /**
     * Build a consumer to evaluate a SPARQL INSERT clause
     * @private
     * @param source - Source iterator
     * @param group - parsed SPARQL INSERT clause
     * @param graph - RDF Graph used to insert data
     * @return A consumer used to evaluate a SPARQL INSERT clause
     */
    UpdateExecutor.prototype._buildInsertConsumer = function (source, group, graph, context) {
        var tripleSource = construct_1.default(source, { template: group.triples });
        if (graph === null) {
            graph = (group.type === 'graph' && 'name' in group) ? this._dataset.getNamedGraph(group.name) : this._dataset.getDefaultGraph();
        }
        return new insert_consumer_1.default(tripleSource, graph, context);
    };
    /**
     * Build a consumer to evaluate a SPARQL DELETE clause
     * @private
     * @param  source - Source iterator
     * @param  group - parsed SPARQL DELETE clause
     * @param  graph - RDF Graph used to delete data
     * @return A consumer used to evaluate a SPARQL DELETE clause
     */
    UpdateExecutor.prototype._buildDeleteConsumer = function (source, group, graph, context) {
        var tripleSource = construct_1.default(source, { template: group.triples });
        if (graph === null) {
            graph = (group.type === 'graph' && 'name' in group) ? this._dataset.getNamedGraph(group.name) : this._dataset.getDefaultGraph();
        }
        return new delete_consumer_1.default(tripleSource, graph, context);
    };
    /**
     * Build a Consumer to evaluate CLEAR queries
     * @private
     * @param query - Parsed query
     * @return A Consumer used to evaluate CLEAR queries
     */
    UpdateExecutor.prototype._handleClearQuery = function (query) {
        var graph = null;
        var iris = this._dataset.iris;
        if (query.graph.default) {
            graph = this._dataset.getDefaultGraph();
        }
        else if (query.graph.all) {
            graph = this._dataset.getUnionGraph(iris, true);
        }
        else if (query.graph.named) {
            graph = this._dataset.getUnionGraph(iris, false);
        }
        else {
            graph = this._dataset.getNamedGraph(query.graph.name);
        }
        return new clear_consumer_1.default(graph);
    };
    return UpdateExecutor;
}(executor_1.default));
exports.default = UpdateExecutor;
