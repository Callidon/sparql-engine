/* file : triple-operator.ts
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
var bindings_1 = require("../../rdf/bindings");
var utils_1 = require("../../utils");
var lodash_1 = require("lodash");
/**
 * Perform a join between a source of solution bindings (left relation)
 * and a triple pattern (right relation) using the Index Nested Loop Join algorithm.
 * This algorithm is more efficient if the cardinality of the left relation is smaller
 * than the cardinality of the right one.
 * @param pattern - Triple pattern to join with (right relation)
 * @param graph   - RDF Graph on which the join is performed
 * @param options - Execution options
 * @author Thomas Minier
 */
function indexJoin(pattern, graph, context) {
    return operators_1.mergeMap(function (bindings) {
        var boundedPattern = bindings.bound(pattern);
        // const hasVars = some(boundedPattern, (v: any) => v.startsWith('?'))
        return rxjs_1.from(graph.find(boundedPattern, context))
            .pipe(operators_1.map(function (item) {
            var temp = lodash_1.pickBy(item, function (v, k) {
                return utils_1.rdf.isVariable(boundedPattern[k]);
            });
            temp = lodash_1.mapKeys(temp, function (v, k) {
                return boundedPattern[k];
            });
            // if (size(temp) === 0 && hasVars) return null
            return bindings_1.BindingBase.fromObject(temp).union(bindings);
        }));
    });
}
exports.default = indexJoin;
