/* file : aggregate-executor.ts
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
var bind_1 = require("../../operators/bind");
var sparql_filter_1 = require("../../operators/sparql-filter");
var sparql_groupby_1 = require("../../operators/sparql-groupby");
var lodash_1 = require("lodash");
/**
 * An AggregateExecutor handles the evaluation of Aggregations operations,
 * GROUP BY and HAVING clauses in SPARQL queries.
 * @see https://www.w3.org/TR/sparql11-query/#aggregates
 * @author Thomas Minier
 */
var AggregateExecutor = /** @class */ (function (_super) {
    __extends(AggregateExecutor, _super);
    function AggregateExecutor() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Build an iterator for the evaluation of SPARQL aggregations
     * @param source  - Source iterator
     * @param query   - Parsed SPARQL query (logical execution plan)
     * @param options - Execution options
     * @return An iterator which evaluate SPARQL aggregations
     */
    AggregateExecutor.prototype.buildIterator = function (source, query, context, customFunctions) {
        if ('group' in query) {
            // first, group bindings using the GROUP BY clause
            var iterator = this._executeGroupBy(source, query.group || [], context, customFunctions);
            // next, apply the optional HAVING clause to filter groups
            if ('having' in query) {
                iterator = this._executeHaving(iterator, query.having || [], context, customFunctions);
            }
            return iterator;
        }
        return source;
    };
    /**
     * Build an iterator for the evaluation of a GROUP BY clause
     * @param source  - Source iterator
     * @param  groupby - GROUP BY clause
     * @param  options - Execution options
     * @return An iterator which evaluate a GROUP BY clause
     */
    AggregateExecutor.prototype._executeGroupBy = function (source, groupby, context, customFunctions) {
        var iterator = source;
        // extract GROUP By variables & rewrite SPARQL expressions into BIND clauses
        var variables = [];
        groupby.forEach(function (g) {
            if (lodash_1.isString(g.expression)) {
                variables.push(g.expression);
            }
            else {
                variables.push(g.variable);
                iterator = iterator.pipe(bind_1.default(g.variable, g.expression, customFunctions));
            }
        });
        return sparql_groupby_1.default(iterator, variables);
    };
    /**
     * Build an iterator for the evaluation of a HAVING clause
     * @param  source  - Source iterator
     * @param  having  - HAVING clause
     * @param  options - Execution options
     * @return An iterator which evaluate a HAVING clause
     */
    AggregateExecutor.prototype._executeHaving = function (source, having, context, customFunctions) {
        // thanks to the flexibility of SPARQL expressions,
        // we can rewrite a HAVING clause in a set of FILTER clauses!
        return having.reduce(function (iter, expression) {
            return iter.pipe(sparql_filter_1.default(expression, customFunctions));
        }, source);
    };
    return AggregateExecutor;
}(executor_1.default));
exports.default = AggregateExecutor;
