/* file : execution-context.ts
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
var query_hints_1 = require("./query-hints");
/**
 * An execution context conatains control information for query execution.
 */
var ExecutionContext = /** @class */ (function () {
    function ExecutionContext() {
        this._properties = new Map();
        this._hints = new query_hints_1.QueryHints();
        this._defaultGraphs = [];
        this._namedGraphs = [];
    }
    Object.defineProperty(ExecutionContext.prototype, "defaultGraphs", {
        /**
         * The set of graphs used as the default graph
         * @return The set of graphs used as the default graph
         */
        get: function () {
            return this._defaultGraphs;
        },
        /**
         * Update the set of graphs used as the default graph
         * @param  values - The set of graphs used as the default graph
         */
        set: function (values) {
            this._defaultGraphs = values.slice(0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ExecutionContext.prototype, "namedGraphs", {
        /**
         * The set of graphs used as named graphs
         * @return The set of graphs used as named graphs
         */
        get: function () {
            return this._namedGraphs;
        },
        /**
         * Update the set of graphs used as named graphs
         * @param  values - The set of graphs used as named graphs
         */
        set: function (values) {
            this._namedGraphs = values.slice(0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ExecutionContext.prototype, "hints", {
        /**
         * Get query hints collected until now
         * @return All query hints collected until now
         */
        get: function () {
            return this._hints;
        },
        /**
         * Update the query hints
         * @param  newHints - New query hints
         */
        set: function (newHints) {
            this._hints = newHints;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Get a property associated with a key
     * @param  key - Key associated with the property
     * @return  The value associated with the key
     */
    ExecutionContext.prototype.getProperty = function (key) {
        return this._properties.get(key);
    };
    /**
     * Test if the context contains a property associated with a key
     * @param  key - Key associated with the property
     * @return True if the context contains a property associated with the key
     */
    ExecutionContext.prototype.hasProperty = function (key) {
        return this._properties.has(key);
    };
    /**
     * Set a (key, value) property in the context
     * @param key - Key of the property
     * @param value - Value of the property
     */
    ExecutionContext.prototype.setProperty = function (key, value) {
        this._properties.set(key, value);
    };
    /**
     * Clone the execution context
     * @return A clone of the execution context
     */
    ExecutionContext.prototype.clone = function () {
        var res = new ExecutionContext();
        this._properties.forEach(function (value, key) { return res.setProperty(key, value); });
        res._hints = this.hints.clone();
        res._defaultGraphs = this._defaultGraphs.slice(0);
        res._namedGraphs = this._namedGraphs.slice(0);
        return res;
    };
    /**
     * Merge the context with another execution context
     * @param  other - Execution context to merge with
     * @return The merged execution context
     */
    ExecutionContext.prototype.merge = function (other) {
        var res = this.clone();
        other._properties.forEach(function (value, key) { return res.setProperty(key, value); });
        res._hints = this._hints.merge(other._hints);
        res._defaultGraphs = this._defaultGraphs.concat(other._defaultGraphs);
        res._namedGraphs = this._namedGraphs.concat(other.namedGraphs);
        return res;
    };
    return ExecutionContext;
}());
exports.default = ExecutionContext;
