/* file : bgp-executor.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
var executor_1 = require("./executor");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var graph_capability_1 = require("../../rdf/graph_capability");
var query_hints_1 = require("../context/query-hints");
var bound_join_1 = require("../../operators/join/bound-join");
/**
 * Basic iterator used to evaluate Basic graph patterns using the "evalBGP" method
 * available
 * @private
 */
function bgpEvaluation(bgp, graph, context) {
    return operators_1.mergeMap(function (bindings) {
        var boundedBGP = bgp.map(function (t) { return bindings.bound(t); });
        // const hasVars = boundedBGP.map(p => some(p, v => v!.startsWith('?')))
        //   .reduce((acc, v) => acc && v, true)
        return rxjs_1.from(graph.evalBGP(boundedBGP, context))
            .pipe(operators_1.map(function (item) {
            // if (item.size === 0 && hasVars) return null
            return item.union(bindings);
        }));
    });
}
/**
 * A BGPExecutor is responsible for evaluation BGP in a SPARQL query.
 * Users can extend this class and overrides the "_execute" method to customize BGP evaluation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
var BGPExecutor = /** @class */ (function (_super) {
    __extends(BGPExecutor, _super);
    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    function BGPExecutor(dataset) {
        var _this = _super.call(this) || this;
        _this._dataset = dataset;
        return _this;
    }
    /**
     * Return the RDF Graph to be used for BGP evaluation.
     * * If `iris` is empty, returns the default graph
     * * If `iris` has a single entry, returns the corresponding named graph
     * * Otherwise, returns an UnionGraph based on the provided iris
     * @param  iris - List of Graph's iris
     * @return An RDF Graph
     */
    BGPExecutor.prototype._getGraph = function (iris) {
        if (iris.length === 0) {
            return this._dataset.getDefaultGraph();
        }
        else if (iris.length === 1) {
            return this._dataset.getNamedGraph(iris[0]);
        }
        return this._dataset.getUnionGraph(iris);
    };
    /**
     * Build an iterator to evaluate a BGP
     * @param  source    - Source iterator
     * @param  patterns  - Set of triple patterns
     * @param  options   - Execution options
     * @return An iterator used to evaluate a Basic Graph pattern
     */
    BGPExecutor.prototype.buildIterator = function (source, patterns, context) {
        // select the graph to use for BGP evaluation
        var graph = (context.defaultGraphs.length > 0) ? this._getGraph(context.defaultGraphs) : this._dataset.getDefaultGraph();
        // extract eventual query hints from the BGP & merge them into the context
        var extraction = query_hints_1.parseHints(patterns, context.hints);
        context.hints = extraction[1];
        // rewrite a BGP to remove blank node addedd by the Turtle notation
        var _a = __read(this._replaceBlankNodes(extraction[0]), 2), bgp = _a[0], artificals = _a[1];
        var iterator = this._execute(source, graph, bgp, context);
        if (artificals.length > 0) {
            iterator = iterator.pipe(operators_1.map(function (b) { return b.filter(function (variable) { return artificals.indexOf(variable) < 0; }); }));
        }
        return iterator;
    };
    /**
     * Replace the blank nodes in a BGP by SPARQL variables
     * @param patterns - BGP to rewrite, i.e., a set of triple patterns
     * @return A Tuple [Rewritten BGP, List of SPARQL variable added]
     */
    BGPExecutor.prototype._replaceBlankNodes = function (patterns) {
        var newVariables = [];
        function rewrite(term) {
            var res = term;
            if (term.startsWith('_:')) {
                res = '?' + term.slice(2);
                if (newVariables.indexOf(res) < 0) {
                    newVariables.push(res);
                }
            }
            return res;
        }
        var newBGP = patterns.map(function (p) {
            return {
                subject: rewrite(p.subject),
                predicate: rewrite(p.predicate),
                object: rewrite(p.object)
            };
        });
        return [newBGP, newVariables];
    };
    /**
     * Returns an iterator used to evaluate a Basic Graph pattern
     * @param  source         - Source iterator
     * @param  graph          - The graph on which the BGP should be executed
     * @param  patterns       - Set of triple patterns
     * @param  options        - Execution options
     * @param  isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
     * @return An iterator used to evaluate a Basic Graph pattern
     */
    BGPExecutor.prototype._execute = function (source, graph, patterns, context) {
        if (graph._isCapable(graph_capability_1.GRAPH_CAPABILITY.UNION)) {
            return bound_join_1.default(source, patterns, graph, context);
        }
        return source.pipe(bgpEvaluation(patterns, graph, context));
    };
    return BGPExecutor;
}(executor_1.default));
exports.default = BGPExecutor;
