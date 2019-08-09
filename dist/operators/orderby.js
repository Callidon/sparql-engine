/* file : orderby.ts
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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
/**
 * Build a comparator function from an ORDER BY clause content
 * @private
 * @param  comparators - ORDER BY comparators
 * @return A comparator function
 */
function _compileComparators(comparators) {
    var comparatorsFuncs = comparators.map(function (c) {
        return function (left, right) {
            if (left.get(c.expression) < right.get(c.expression)) {
                return (c.ascending) ? -1 : 1;
            }
            else if (left.get(c.expression) > right.get(c.expression)) {
                return (c.ascending) ? 1 : -1;
            }
            return 0;
        };
    });
    return function (left, right) {
        var e_1, _a;
        var temp;
        try {
            for (var comparatorsFuncs_1 = __values(comparatorsFuncs), comparatorsFuncs_1_1 = comparatorsFuncs_1.next(); !comparatorsFuncs_1_1.done; comparatorsFuncs_1_1 = comparatorsFuncs_1.next()) {
                var comp = comparatorsFuncs_1_1.value;
                temp = comp(left, right);
                if (temp !== 0) {
                    return temp;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (comparatorsFuncs_1_1 && !comparatorsFuncs_1_1.done && (_a = comparatorsFuncs_1.return)) _a.call(comparatorsFuncs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return 0;
    };
}
/**
 * A OrderByOperator implements a ORDER BY clause, i.e.,
 * it sorts solution mappings produced by another operator
 * @extends MaterializeOperator
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modOrderBy}
 */
function orderby(source, comparators) {
    var comparator = _compileComparators(comparators.map(function (c) {
        // explicity tag ascending comparators (sparqljs leaves them untagged)
        if (!('descending' in c)) {
            c.ascending = true;
        }
        return c;
    }));
    return source
        .pipe(operators_1.toArray())
        .pipe(operators_1.mergeMap(function (values) {
        values.sort(function (a, b) { return comparator(a, b); });
        return rxjs_1.from(values);
    }));
}
exports.default = orderby;
