/* file : plan-builder.ts
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
// General libraries
var sparqljs_1 = require("sparqljs");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var bindings_1 = require("../rdf/bindings");
// SPARQL query operators
var bind_1 = require("../operators/bind");
var sparql_distinct_1 = require("../operators/sparql-distinct");
var exists_1 = require("../operators/exists");
var sparql_filter_1 = require("../operators/sparql-filter");
var minus_1 = require("../operators/minus");
var optional_1 = require("../operators/optional");
var orderby_1 = require("../operators/orderby");
// Solution modifiers
var ask_1 = require("../operators/modifiers/ask");
var construct_1 = require("../operators/modifiers/construct");
var select_1 = require("../operators/modifiers/select");
// Executors
var aggregate_executor_1 = require("./executors/aggregate-executor");
var bgp_executor_1 = require("./executors/bgp-executor");
var graph_executor_1 = require("./executors/graph-executor");
var update_executor_1 = require("./executors/update-executor");
// Utilities
var lodash_1 = require("lodash");
var execution_context_1 = require("./context/execution-context");
var rewritings_1 = require("./executors/rewritings");
var utils_1 = require("../utils");
var QUERY_MODIFIERS = {
    SELECT: select_1.default,
    CONSTRUCT: construct_1.default,
    ASK: ask_1.default
};
/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
var PlanBuilder = /** @class */ (function () {
    /**
     * Constructor
     * @param dataset - RDF Dataset used for query execution
     * @param prefixes - Optional prefixes to use during query processing
     */
    function PlanBuilder(dataset, prefixes, customFunctions) {
        if (prefixes === void 0) { prefixes = {}; }
        this._dataset = dataset;
        this._parser = new sparqljs_1.Parser(prefixes);
        this._bgpExecutor = new bgp_executor_1.default(this._dataset);
        this._aggExecutor = new aggregate_executor_1.default();
        this._graphExecutor = new graph_executor_1.default(this._dataset);
        this._graphExecutor.builder = this;
        this._updateExecutor = new update_executor_1.default(this._dataset);
        this._updateExecutor.builder = this;
        this._customFunctions = customFunctions;
        this._serviceExecutor = null;
        this._pathExecutor = null;
    }
    Object.defineProperty(PlanBuilder.prototype, "bgpExecutor", {
        /**
         * Set the BGP executor used to evaluate Basic Graph patterns
         * @param executor - Executor used to evaluate Basic Graph patterns
         */
        set: function (executor) {
            this._bgpExecutor.builder = null;
            this._bgpExecutor = executor;
            this._bgpExecutor.builder = this;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlanBuilder.prototype, "pathExecutor", {
        /**
         * Set the BGP executor used to evaluate Basic Graph patterns
         * @param executor - Executor used to evaluate Basic Graph patterns
         */
        set: function (executor) {
            if (this._pathExecutor !== null) {
                this._pathExecutor.builder = null;
            }
            this._pathExecutor = executor;
            this._pathExecutor.builder = this;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlanBuilder.prototype, "aggregateExecutor", {
        /**
         * Set the BGP executor used to evaluate SPARQL Aggregates
         * @param executor - Executor used to evaluate SPARQL Aggregates
         */
        set: function (executor) {
            this._aggExecutor.builder = null;
            this._aggExecutor = executor;
            this._aggExecutor.builder = this;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlanBuilder.prototype, "graphExecutor", {
        /**
         * Set the BGP executor used to evaluate SPARQL GRAPH clauses
         * @param executor - Executor used to evaluate SPARQL GRAPH clauses
         */
        set: function (executor) {
            this._graphExecutor.builder = null;
            this._graphExecutor = executor;
            this._graphExecutor.builder = this;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlanBuilder.prototype, "updateExecutor", {
        /**
         * Set the BGP executor used to evaluate SPARQL UPDATE queries
         * @param executor - Executor used to evaluate SPARQL UPDATE queries
         */
        set: function (executor) {
            this._updateExecutor.builder = null;
            this._updateExecutor = executor;
            this._updateExecutor.builder = this;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlanBuilder.prototype, "serviceExecutor", {
        /**
         * Set the executor used to evaluate SERVICE clauses
         * @param executor - Executor used to evaluate SERVICE clauses
         */
        set: function (executor) {
            if (this._serviceExecutor !== null) {
                this._serviceExecutor.builder = null;
            }
            this._serviceExecutor = executor;
            this._serviceExecutor.builder = this;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Build the physical query execution of a SPARQL 1.1 query
     * and returns an iterator that can be consumed to evaluate the query.
     * @param  query        - SPARQL query to evaluated
     * @param  options  - Execution options
     * @return An iterator that can be consumed to evaluate the query.
     */
    PlanBuilder.prototype.build = function (query, context) {
        // If needed, parse the string query into a logical query execution plan
        if (typeof query === 'string') {
            query = this._parser.parse(query);
        }
        if (lodash_1.isNull(context) || lodash_1.isUndefined(context)) {
            context = new execution_context_1.default();
        }
        switch (query.type) {
            case 'query':
                return this._buildQueryPlan(query, context);
            case 'update':
                return this._updateExecutor.execute(query.updates, context);
            default:
                throw new SyntaxError("Unsupported SPARQL query type: " + query.type);
        }
    };
    /**
     * Build the physical query execution of a SPARQL query
     * @param  query         - Parsed SPARQL query
     * @param  options  - Execution options
     * @param  source - Source iterator
     * @return An iterator that can be consumed to evaluate the query.
     */
    PlanBuilder.prototype._buildQueryPlan = function (query, context, source) {
        var _this = this;
        if (lodash_1.isNull(source) || lodash_1.isUndefined(source)) {
            // build pipeline starting iterator
            source = rxjs_1.of(new bindings_1.BindingBase());
        }
        context.setProperty('prefixes', query.prefixes);
        var aggregates = [];
        // rewrite a DESCRIBE query into a CONSTRUCT query
        if (query.queryType === 'DESCRIBE') {
            var template_1 = [];
            var where_1 = [{
                    type: 'bgp',
                    triples: []
                }];
            query.variables.forEach(function (v) {
                var triple = utils_1.rdf.triple(v, "?pred__describe__" + v, "?obj__describe__" + v);
                template_1.push(triple);
                where_1[0].triples.push(triple);
            });
            var construct_2 = {
                prefixes: query.prefixes,
                from: query.from,
                queryType: 'CONSTRUCT',
                template: template_1,
                type: 'query',
                where: query.where.concat(where_1)
            };
            return this._buildQueryPlan(construct_2, context, source);
        }
        // Handles FROM clauses
        if (query.from) {
            context.defaultGraphs = query.from.default;
            context.namedGraphs = query.from.named;
        }
        // Handles WHERE clause
        var graphIterator;
        if (query.where != null && query.where.length > 0) {
            graphIterator = this._buildWhere(source, query.where, context);
        }
        else {
            graphIterator = rxjs_1.of(new bindings_1.BindingBase());
        }
        // Parse query variable to separate projection & aggregate variables
        if ('variables' in query) {
            var parts = lodash_1.partition(query.variables, function (v) { return lodash_1.isString(v); });
            aggregates = parts[1];
            // add aggregates variables to projection variables
            query.variables = parts[0].concat(aggregates.map(function (agg) { return agg.variable; }));
        }
        // Handles Aggregates
        graphIterator = this._aggExecutor.buildIterator(graphIterator, query, context, this._customFunctions);
        // Handles transformers
        if (aggregates.length > 0) {
            graphIterator = aggregates.reduce(function (obs, agg) {
                return obs.pipe(bind_1.default(agg.variable, agg.expression, _this._customFunctions));
            }, graphIterator);
        }
        // Handles ORDER BY
        if ('order' in query) {
            graphIterator = orderby_1.default(graphIterator, query.order);
        }
        if (!(query.queryType in QUERY_MODIFIERS)) {
            throw new Error("Unsupported SPARQL query type: " + query.queryType);
        }
        graphIterator = QUERY_MODIFIERS[query.queryType](graphIterator, query, context);
        // Create iterators for modifiers
        if (query.distinct) {
            graphIterator = graphIterator.pipe(sparql_distinct_1.default());
        }
        // Add offsets and limits if requested
        if ('offset' in query) {
            graphIterator = graphIterator.pipe(operators_1.skip(query.offset));
        }
        if ('limit' in query) {
            graphIterator = graphIterator.pipe(operators_1.take(query.limit));
        }
        // graphIterator.queryType = query.queryType
        return graphIterator;
    };
    /**
     * Optimize a WHERE clause and build the corresponding physical plan
     * @param  source  - Source iterator
     * @param  groups   - WHERE clause to process
     * @param  options  - Execution options
     * @return An iterator used to evaluate the WHERE clause
     */
    PlanBuilder.prototype._buildWhere = function (source, groups, context) {
        var _this = this;
        groups = lodash_1.sortBy(groups, function (g) {
            switch (g.type) {
                case 'bgp':
                    return 0;
                case 'values':
                    return 2;
                case 'filter':
                    return 3;
                default:
                    return 0;
            }
        });
        // Handle VALUES clauses using query rewriting
        if (lodash_1.some(groups, function (g) { return g.type === 'values'; })) {
            return this._buildValues(source, groups, context);
        }
        // merge BGPs on the same level
        var newGroups = [];
        var prec = null;
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            if (group.type === 'bgp' && prec != null && prec.type === 'bgp') {
                var lastGroup = newGroups[newGroups.length - 1];
                lastGroup.triples = lastGroup.triples.concat(group.triples);
            }
            else {
                newGroups.push(group);
            }
            prec = groups[i];
        }
        groups = newGroups;
        return groups.reduce(function (source, group) {
            return _this._buildGroup(source, group, context);
        }, source);
    };
    /**
     * Build a physical plan for a SPARQL group clause
     * @param  source  - Source iterator
     * @param  group   - SPARQL Group
     * @param  options - Execution options
     * @return An iterator used to evaluate the SPARQL Group
     */
    PlanBuilder.prototype._buildGroup = function (source, group, context) {
        var _this = this;
        // Reset flags on the options for child iterators
        var childContext = context.clone();
        switch (group.type) {
            case 'bgp':
                if (lodash_1.isNull(this._bgpExecutor)) {
                    throw new Error('A PlanBuilder cannot evaluate a Basic Graph Pattern without a BGPExecutor');
                }
                // find possible Property paths
                var _a = __read(rewritings_1.extractPropertyPaths(group), 3), classicTriples = _a[0], pathTriples = _a[1], tempVariables_1 = _a[2];
                if (pathTriples.length > 0) {
                    if (lodash_1.isNull(this._pathExecutor)) {
                        throw new Error('A PlanBuilder cannot evaluate property paths without a PathExecutor');
                    }
                    source = this._pathExecutor.executeManyPaths(source, pathTriples, context);
                }
                // delegate remaining BGP evaluation to the dedicated executor
                var iter = this._bgpExecutor.buildIterator(source, classicTriples, childContext);
                // filter out variables added by the rewriting of property paths
                if (tempVariables_1.length > 0) {
                    iter = iter.pipe(operators_1.map(function (bindings) {
                        return bindings.filter(function (v) { return tempVariables_1.indexOf(v) == -1; });
                    }));
                }
                return iter;
            case 'query':
                return this._buildQueryPlan(group, childContext, source);
            case 'graph':
                if (lodash_1.isNull(this._graphExecutor)) {
                    throw new Error('A PlanBuilder cannot evaluate a GRAPH clause without a GraphExecutor');
                }
                // delegate GRAPH evaluation to an executor
                return this._graphExecutor.buildIterator(source, group, childContext);
            case 'service':
                if (lodash_1.isNull(this._serviceExecutor)) {
                    throw new Error('A PlanBuilder cannot evaluate a SERVICE clause without a ServiceExecutor');
                }
                // delegate SERVICE evaluation to an executor
                return this._serviceExecutor.buildIterator(source, group, childContext);
            case 'group':
                return this._buildWhere(source, group.patterns, childContext);
            case 'optional':
                return optional_1.default(source, group.patterns, this, childContext);
            case 'union':
                return rxjs_1.merge.apply(void 0, __spread(group.patterns.map(function (patternToken) {
                    return _this._buildGroup(source, patternToken, childContext);
                })));
            case 'minus':
                var rightSource = this._buildWhere(rxjs_1.of(new bindings_1.BindingBase()), group.patterns, childContext);
                return minus_1.default(source, rightSource);
            case 'filter':
                var filter = group;
                // FILTERs (NOT) EXISTS are handled using dedicated operators
                switch (filter.expression.operator) {
                    case 'exists':
                        return exists_1.default(source, filter.expression.args, this, false, childContext);
                    case 'notexists':
                        return exists_1.default(source, filter.expression.args, this, true, childContext);
                    default:
                        return source.pipe(sparql_filter_1.default(filter.expression, this._customFunctions));
                }
            case 'bind':
                var bindNode = group;
                return source.pipe(bind_1.default(bindNode.variable, bindNode.expression, this._customFunctions));
            default:
                throw new Error("Unsupported SPARQL group pattern found in query: " + group.type);
        }
    };
    /**
     * Build an iterator which evaluates a SPARQL query with VALUES clause(s).
     * It rely on a query rewritiing approach:
     * ?s ?p ?o . VALUES ?s { :1 :2 } becomes {:1 ?p ?o BIND(:1 AS ?s)} UNION {:2 ?p ?o BIND(:2 AS ?s)}
     * @param source  - Source iterator
     * @param groups  - Query body, i.e., WHERE clause
     * @param options - Execution options
     * @return An iterator which evaluates a SPARQL query with VALUES clause(s)
     */
    PlanBuilder.prototype._buildValues = function (source, groups, context) {
        var _this = this;
        var _a = __read(lodash_1.partition(groups, function (g) { return g.type === 'values'; }), 2), values = _a[0], others = _a[1];
        var bindingsLists = values.map(function (g) { return g.values; });
        // for each VALUES clause
        var iterators = bindingsLists.map(function (bList) {
            // for each value to bind in the VALUES clause
            var unionBranches = bList.map(function (b) {
                var bindings = bindings_1.BindingBase.fromObject(b);
                // BIND each group with the set of bindings and then evaluates it
                var temp = others.map(function (g) { return utils_1.deepApplyBindings(g, bindings); });
                return utils_1.extendByBindings(_this._buildWhere(source, temp, context), bindings);
            });
            return rxjs_1.merge.apply(void 0, __spread(unionBranches));
        });
        // Users may use more than one VALUES clause
        if (iterators.length > 1) {
            return rxjs_1.merge.apply(void 0, __spread(iterators));
        }
        return iterators[0];
    };
    return PlanBuilder;
}());
exports.default = PlanBuilder;
