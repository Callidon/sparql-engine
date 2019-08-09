/* file : select.ts
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
var operators_1 = require("rxjs/operators");
var utils_1 = require("../../utils");
/**
 * Evaluates a SPARQL SELECT operation, i.e., perform a selection over sets of solutions bindings
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#select}
 * @param query - SELECT query
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
function select(source, query) {
    var variables = query.variables;
    var selectAll = variables.length === 1 && variables[0] === '*';
    return source.pipe(operators_1.map(function (bindings) {
        if (!selectAll) {
            bindings = variables.reduce(function (obj, v) {
                if (bindings.has(v)) {
                    obj.set(v, bindings.get(v));
                }
                else {
                    obj.set(v, 'UNBOUND');
                }
                return obj;
            }, bindings.empty());
        }
        return bindings.mapValues(function (k, v) { return utils_1.rdf.isVariable(k) && typeof v === 'string' ? v : null; });
    }));
}
exports.default = select;
