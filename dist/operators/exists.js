/* file : exists.ts
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
var bindings_1 = require("../rdf/bindings");
/**
 * Evaluates a SPARQL FILTER (NOT) EXISTS clause
 * @param source - Source observable
 * @param groups    - Content of the FILTER clause
 * @param builder   - Plan builder used to evaluate subqueries
 * @param notexists - True if the filter is NOT EXISTS, False otherwise
 * @param options   - Execution options
 * @author Thomas Minier
 * TODO this function could be simplified using a filterMap like operator, we should check if Rxjs offers that filterMap
 */
function exists(source, groups, builder, notexists, context) {
    var defaultValue = new bindings_1.BindingBase();
    defaultValue.setProperty('exists', false);
    return source
        .pipe(operators_1.mergeMap(function (bindings) {
        return builder._buildWhere(rxjs_1.of(bindings), groups, context)
            .pipe(operators_1.defaultIfEmpty(defaultValue))
            .pipe(operators_1.first())
            .pipe(operators_1.map(function (b) {
            var exists = (!b.hasProperty('exists')) || b.getProperty('exists');
            return {
                bindings: bindings,
                output: (exists && (!notexists)) || ((!exists) && notexists)
            };
        }));
    }))
        .pipe(operators_1.filter(function (b) {
        return b.output;
    }))
        .pipe(operators_1.map(function (b) { return b.bindings; }));
}
exports.default = exists;
