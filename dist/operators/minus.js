/* file : minus.ts
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
var lodash_1 = require("lodash");
/**
 * Evaluates a SPARQL MINUS clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#neg-minus}
 * @extends TransformIterator
 * @author Thomas Minier
 */
function minus(source, rightSource) {
    // first materialize the right source in a buffer, then apply difference on the left source
    return rightSource
        .pipe(operators_1.reduce(function (acc, b) { return lodash_1.concat(acc, b); }, []))
        .pipe(operators_1.mergeMap(function (buffer) {
        return source
            .pipe(operators_1.filter(function (bindings) {
            var leftKeys = Array.from(bindings.variables());
            // mu_a is compatible with mu_b if,
            // for all v in intersection(dom(mu_a), dom(mu_b)), mu_a[v] = mu_b[v]
            var isCompatible = buffer.some(function (b) {
                var rightKeys = Array.from(b.variables());
                var commonKeys = lodash_1.intersection(leftKeys, rightKeys);
                return commonKeys.every(function (k) { return b.get(k) === bindings.get(k); });
            });
            // only output non-compatible bindings
            return !isCompatible;
        }));
    }));
}
exports.default = minus;
