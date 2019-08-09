/* file : graph-executor.ts
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var executor_1 = require("./executor");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var utils_1 = require("../../utils");
/**
 * A GraphExecutor is responsible for evaluation a GRAPH clause in a SPARQL query.
 * @author Thomas Minier
 */
var GraphExecutor = /** @class */ (function (_super) {
    __extends(GraphExecutor, _super);
    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    function GraphExecutor(dataset) {
        var _this = _super.call(this) || this;
        _this._dataset = dataset;
        return _this;
    }
    /**
     * Build an iterator to evaluate a GRAPH clause
     * @param  source  - Source iterator
     * @param  node    - Graph clause
     * @param  options - Execution options
     * @return An iterator used to evaluate a GRAPH clause
     */
    GraphExecutor.prototype.buildIterator = function (source, node, context) {
        var _this = this;
        var subquery;
        if (node.patterns[0].type === 'query') {
            subquery = node.patterns[0];
        }
        else {
            subquery = {
                prefixes: context.getProperty('prefixes'),
                queryType: 'SELECT',
                variables: ['*'],
                type: 'query',
                where: node.patterns
            };
        }
        //if the node is a variable, check to see if it's either a bound variable or a named graph
        if (utils_1.rdf.isVariable(node.name)) {
            // clone the source first
            source = source.pipe(operators_1.shareReplay(5));
            return source.pipe(operators_1.mergeMap(function (bindings) {
                //check for bound variable
                var eachBinding = rxjs_1.from([bindings]);
                var variableIRI = bindings.get(node.name);
                if (variableIRI) {
                    return _this._execute(eachBinding, variableIRI, subquery, context);
                }
                else if (context.namedGraphs.length > 0) {
                    //if there are named graphs, execute them on each 
                    var iterators = context.namedGraphs.map(function (iri) {
                        return _this._execute(eachBinding, iri, subquery, context).pipe(operators_1.map(function (b) {
                            return b.extendMany([[node.name, iri]]);
                        }));
                    });
                    return rxjs_1.merge.apply(void 0, __spread(iterators));
                }
                return eachBinding;
            }));
        }
        // otherwise, execute the subquery using the Graph
        return this._execute(source, node.name, subquery, context);
    };
    /**
     * Returns an iterator used to evaluate a GRAPH clause
     * @param  source    - Source iterator
     * @param  iri       - IRI of the GRAPH clause
     * @param  subquery  - Subquery to be evaluated
     * @param  options   - Execution options
     * @return An iterator used to evaluate a GRAPH clause
     */
    GraphExecutor.prototype._execute = function (source, iri, subquery, context) {
        var opts = context.clone();
        opts.defaultGraphs = [iri];
        return this._builder._buildQueryPlan(subquery, opts, source);
    };
    return GraphExecutor;
}(executor_1.default));
exports.default = GraphExecutor;
