/* file : sparql-expression.ts
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
var sparql_aggregates_1 = require("./sparql-aggregates");
var sparql_operations_1 = require("./sparql-operations");
var utils_1 = require("../../utils");
var lodash_1 = require("lodash");
function bindArgument(variable) {
    return function (bindings) {
        if (bindings.has(variable)) {
            return utils_1.rdf.parseTerm(bindings.get(variable));
        }
        return null;
    };
}
/**
 * Compile and evaluate a SPARQL expression (found in FILTER clauses, for example)
 * @author Thomas Minier
 */
var SPARQLExpression = /** @class */ (function () {
    /**
     * Constructor
     * @param expression - SPARQL expression
     */
    function SPARQLExpression(expression, customFunctions) {
        this._expression = this._compileExpression(expression, customFunctions);
    }
    /**
     * Recursively compile a SPARQL expression into a function
     * @param  expression - SPARQL expression
     * @return Compiled SPARQL expression
     */
    SPARQLExpression.prototype._compileExpression = function (expression, customFunctions) {
        var _this = this;
        // simple case: the expression is a SPARQL variable or a RDF term
        if (lodash_1.isString(expression)) {
            if (utils_1.rdf.isVariable(expression)) {
                return bindArgument(expression);
            }
            var compiledTerm_1 = utils_1.rdf.parseTerm(expression);
            return function () { return compiledTerm_1; };
        }
        else if (lodash_1.isArray(expression)) {
            // IN and NOT IN expressions accept arrays as argument
            var compiledTerms_1 = expression.map(utils_1.rdf.parseTerm);
            return function () { return compiledTerms_1; };
        }
        else if (expression.type === 'operation') {
            var opExpression = expression;
            // operation case: recursively compile each argument, then evaluate the expression
            var args_1 = opExpression.args.map(function (arg) { return _this._compileExpression(arg, customFunctions); });
            if (!(opExpression.operator in sparql_operations_1.default)) {
                throw new Error("Unsupported SPARQL operation: " + opExpression.operator);
            }
            var operation_1 = sparql_operations_1.default[opExpression.operator];
            return function (bindings) {
                return operation_1.apply(void 0, __spread(args_1.map(function (arg) { return arg(bindings); })));
            };
        }
        else if (expression.type === 'aggregate') {
            var aggExpression_1 = expression;
            // aggregation case
            if (!(aggExpression_1.aggregation in sparql_aggregates_1.default)) {
                throw new Error("Unsupported SPARQL aggregation: " + aggExpression_1.aggregation);
            }
            var aggregation_1 = sparql_aggregates_1.default[aggExpression_1.aggregation];
            return function (bindings) {
                if (bindings.hasProperty('__aggregate')) {
                    return aggregation_1(aggExpression_1.expression, bindings.getProperty('__aggregate'), aggExpression_1.separator);
                }
                return bindings;
            };
        }
        else if (expression.type === 'functionCall') {
            var functionExpression_1 = expression;
            var customFunction_1 = (customFunctions && customFunctions[functionExpression_1.function])
                ? customFunctions[functionExpression_1.function]
                : null;
            if (!customFunction_1) {
                throw new Error("Custom function could not be found: " + functionExpression_1.function);
            }
            return function (bindings) {
                try {
                    var args = functionExpression_1.args.map(function (args) { return _this._compileExpression(args, customFunctions); });
                    return customFunction_1.apply(void 0, __spread(args.map(function (arg) { return arg(bindings); })));
                }
                catch (e) {
                    // In section 10 of the sparql docs (https://www.w3.org/TR/sparql11-query/#assignment) it states:
                    // "If the evaluation of the expression produces an error, the variable remains unbound for that solution but the query evaluation continues."
                    // unfortunately this means the error is silent unless some logging is introduced here,
                    // which is probably not desired unless a logging framework is introduced
                    return null;
                }
            };
        }
        throw new Error("Unsupported SPARQL operation type found: " + expression.type);
    };
    /**
     * Evaluate the expression using a set of mappings
     * @param  bindings - Set of mappings
     * @return Results of the evaluation
     */
    SPARQLExpression.prototype.evaluate = function (bindings) {
        return this._expression(bindings);
    };
    return SPARQLExpression;
}());
exports.default = SPARQLExpression;
