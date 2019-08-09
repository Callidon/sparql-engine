/* file : insert-consumer.ts
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
var consumer_1 = require("./consumer");
/**
 * A DeleteConsumer evaluates a SPARQL DELETE clause
 * @extends Consumer
 * @author Thomas Minier
 */
var DeleteConsumer = /** @class */ (function (_super) {
    __extends(DeleteConsumer, _super);
    /**
     * Constructor
     * @param source - Source iterator
     * @param graph - Input RDF Graph
     * @param options - Execution options
     */
    function DeleteConsumer(source, graph, options) {
        var _this = _super.call(this, source, options) || this;
        _this._graph = graph;
        return _this;
    }
    DeleteConsumer.prototype._write = function (triple, encoding, done) {
        var _this = this;
        this._graph.delete(triple)
            .then(function () { return done(); })
            .catch(function (err) {
            _this.emit('error', err);
            done(err);
        });
    };
    return DeleteConsumer;
}(consumer_1.Consumer));
exports.default = DeleteConsumer;
