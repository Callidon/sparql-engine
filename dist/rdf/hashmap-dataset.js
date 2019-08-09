/* file : hashmap-dataset.ts
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
var dataset_1 = require("./dataset");
/**
 * A simple Dataset backed by a HashMap.
 * @extends Dataset
 * @author Thomas Minier
 */
var HashMapDataset = /** @class */ (function (_super) {
    __extends(HashMapDataset, _super);
    /**
     * Constructor
     * @param defaultGraphIRI - IRI of the Default Graph
     * @param defaultGraph     - Default Graph
     */
    function HashMapDataset(defaultGraphIRI, defaultGraph) {
        var _this = _super.call(this) || this;
        defaultGraph.iri = defaultGraphIRI;
        _this._defaultGraph = defaultGraph;
        _this._namedGraphs = new Map();
        return _this;
    }
    Object.defineProperty(HashMapDataset.prototype, "iris", {
        get: function () {
            return Array.from(this._namedGraphs.keys());
        },
        enumerable: true,
        configurable: true
    });
    HashMapDataset.prototype.setDefaultGraph = function (g) {
        this._defaultGraph = g;
    };
    HashMapDataset.prototype.getDefaultGraph = function () {
        return this._defaultGraph;
    };
    HashMapDataset.prototype.addNamedGraph = function (iri, g) {
        g.iri = iri;
        this._namedGraphs.set(iri, g);
    };
    HashMapDataset.prototype.getNamedGraph = function (iri) {
        if (iri === this._defaultGraph.iri) {
            return this.getDefaultGraph();
        }
        else if (!this._namedGraphs.has(iri)) {
            throw new Error("Unknown graph with iri " + iri);
        }
        return this._namedGraphs.get(iri);
    };
    HashMapDataset.prototype.hasNamedGraph = function (iri) {
        return this._namedGraphs.has(iri);
    };
    return HashMapDataset;
}(dataset_1.default));
exports.default = HashMapDataset;
