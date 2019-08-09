/* file : consumer.ts
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
var stream_1 = require("stream");
/**
 * A Consumable that always fails to execute
 */
var ErrorConsumable = /** @class */ (function () {
    /**
     * Constructor
     * @param reason - Cause of the failure
     */
    function ErrorConsumable(reason) {
        this._reason = new Error(reason);
    }
    ErrorConsumable.prototype.execute = function () {
        return Promise.reject(this._reason);
    };
    return ErrorConsumable;
}());
exports.ErrorConsumable = ErrorConsumable;
/**
 * A Consumer consumes bindings from an iterator to evaluate a SPARQL UPDATE query
 * @abstract
 * @extends Writable
 * @author Thomas Minier
 */
var Consumer = /** @class */ (function (_super) {
    __extends(Consumer, _super);
    /**
     * Constructor
     * @param source - Source iterator
     * @param options - Execution options
     */
    function Consumer(source, options) {
        var _this = _super.call(this, { objectMode: true }) || this;
        _this._source = source;
        _this._options = options;
        return _this;
    }
    Consumer.prototype.execute = function () {
        var _this = this;
        // if the source has already ended, no need to drain it
        return new Promise(function (resolve, reject) {
            _this._source.subscribe(function (triple) {
                _this.write(triple);
            }, reject, function () {
                _this.end(null, '', resolve);
            });
        });
    };
    return Consumer;
}(stream_1.Writable));
exports.Consumer = Consumer;
