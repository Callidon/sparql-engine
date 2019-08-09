/* file : graph.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var index_join_1 = require("../operators/join/index-join");
var utils_1 = require("../utils");
var bindings_1 = require("./bindings");
var graph_capability_1 = require("./graph_capability");
/**
 * Comparator function for sorting triple pattern
 * by ascending cardinality and descending number of variables
 * @private
 * @param  {Object} a - Metadata about left triple
 * @param  {Object} b - Metadata about right triple
 * @return Comparaison result (-1, 1, 0)
 */
function sortPatterns(a, b) {
    if (a.cardinality < b.cardinality) {
        return -1;
    }
    else if (a.cardinality > b.cardinality) {
        return 1;
    }
    else if (a.nbVars > b.nbVars) {
        return -1;
    }
    else if (a.nbVars < b.nbVars) {
        return 1;
    }
    return 0;
}
function parseCapabilities(registry, proto) {
    registry.set(graph_capability_1.GRAPH_CAPABILITY.ESTIMATE_TRIPLE_CARD, proto.estimateCardinality != null);
    registry.set(graph_capability_1.GRAPH_CAPABILITY.UNION, proto.evalUnion != null);
}
/**
 * An abstract RDF Graph, accessed through a RDF Dataset
 * @abstract
 * @author Thomas Minier
 */
var Graph = /** @class */ (function () {
    function Graph() {
        this._iri = '';
        this._capabilities = new Map();
        parseCapabilities(this._capabilities, Object.getPrototypeOf(this));
    }
    Object.defineProperty(Graph.prototype, "iri", {
        /**
         * Get the IRI of the Graph
         * @return The IRI of the Graph
         */
        get: function () {
            return this._iri;
        },
        /**
         * Set the IRI of the Graph
         * @param value - The new IRI of the Graph
         */
        set: function (value) {
            this._iri = value;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Test if a graph has a capability
     * @param  token - Capability tested
     * @return True if the graph has the reuqested capability, false otherwise
     */
    Graph.prototype._isCapable = function (token) {
        return this._capabilities.has(token) && this._capabilities.get(token);
    };
    /**
     * Estimate the cardinality of a Triple pattern, i.e., the number of matching RDF Triples in the RDF Graph.
     * @param  triple - Triple pattern to estimate cardinality
     * @return A Promise fulfilled with the pattern's estimated cardinality
     */
    Graph.prototype.estimateCardinality = function (triple) {
        throw new SyntaxError('Error: this graph is not capable of estimating the cardinality of a triple pattern');
    };
    /**
     * Evaluates an union of Basic Graph patterns on the Graph using an iterator.
     * @param  patterns - The set of BGPs to evaluate
     * @param  options - Execution options
     * @return An iterator which evaluates the Basic Graph pattern on the Graph
     */
    Graph.prototype.evalUnion = function (patterns, context) {
        throw new SyntaxError('Error: this graph is not capable of evaluating UNION queries');
    };
    /**
     * Evaluates a Basic Graph pattern, i.e., a set of triple patterns, on the Graph using an iterator.
     * @param  bgp - The set of triple patterns to evaluate
     * @param  options - Execution options
     * @return An iterator which evaluates the Basic Graph pattern on the Graph
     */
    Graph.prototype.evalBGP = function (bgp, context) {
        var _this = this;
        if (this._isCapable(graph_capability_1.GRAPH_CAPABILITY.ESTIMATE_TRIPLE_CARD)) {
            return rxjs_1.from(Promise.all(bgp.map(function (triple) {
                return _this.estimateCardinality(triple).then(function (c) {
                    return { triple: triple, cardinality: c, nbVars: utils_1.rdf.countVariables(triple) };
                });
            })))
                .pipe(operators_1.mergeMap(function (results) {
                results.sort(sortPatterns);
                var start = rxjs_1.of(new bindings_1.BindingBase());
                return results.reduce(function (iter, v) {
                    return iter.pipe(index_join_1.default(v.triple, _this, context));
                }, start);
            }));
        }
        else {
            // FIX ME: this trick is required, otherwise ADD, COPY and MOVE queries are not evaluated correctly. We need to find why...
            return rxjs_1.from(Promise.resolve(null))
                .pipe(operators_1.mergeMap(function () {
                var start = rxjs_1.of(new bindings_1.BindingBase());
                return bgp.reduce(function (iter, t) {
                    return iter.pipe(index_join_1.default(t, _this, context));
                }, start);
            }));
        }
    };
    return Graph;
}());
exports.default = Graph;
// disable optional methods
Object.defineProperty(Graph.prototype, 'estimateCardinality', { value: null });
Object.defineProperty(Graph.prototype, 'evalUnion', { value: null });
