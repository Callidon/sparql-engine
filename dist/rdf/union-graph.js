/* file : union-graph.ts
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
var rxjs_1 = require("rxjs");
var graph_1 = require("./graph");
/**
 * An UnionGraph represents the dynamic union of several graphs.
 * Addition only affects the left-most operand, deletion affects all graphs.
 * Searching for RDF triple smatching a triple pattern in such Graph is equivalent
 * as the Union of matching RDF triples in all graphs.
 * @extends Graph
 * @author Thomas Minier
 */
var UnionGraph = /** @class */ (function (_super) {
    __extends(UnionGraph, _super);
    /**
     * Constructor
     * @param graphs - Set of RDF graphs
     */
    function UnionGraph(graphs) {
        var _this = _super.call(this) || this;
        _this.iri = graphs.map(function (g) { return g.iri; }).join('+');
        _this._graphs = graphs;
        return _this;
    }
    UnionGraph.prototype.insert = function (triple) {
        return this._graphs[0].insert(triple);
    };
    UnionGraph.prototype.delete = function (triple) {
        return this._graphs.reduce(function (prev, g) { return prev.then(function () { return g.delete(triple); }); }, Promise.resolve());
    };
    UnionGraph.prototype.find = function (triple, context) {
        return rxjs_1.merge.apply(void 0, __spread(this._graphs.map(function (g) { return g.find(triple, context); })));
    };
    UnionGraph.prototype.clear = function () {
        return this._graphs.reduce(function (prev, g) { return prev.then(function () { return g.clear(); }); }, Promise.resolve());
    };
    UnionGraph.prototype.estimateCardinality = function (triple) {
        return Promise.all(this._graphs.map(function (g) { return g.estimateCardinality(triple); }))
            .then(function (cardinalities) {
            return Promise.resolve(cardinalities.reduce(function (acc, x) { return acc + x; }, 0));
        });
    };
    return UnionGraph;
}(graph_1.default));
exports.default = UnionGraph;
