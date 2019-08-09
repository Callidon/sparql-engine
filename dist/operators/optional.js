/* file : optional-iterator.ts
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
/**
 * Like rxjs.defaultIfEmpty, but emits an array of default values
 * @author Thomas Minier
 * @param  values - Default values
 * @return An Observable that emits either the specified `defaultValues` if the source Observable emits no items, or the values emitted by the source Observable.
 */
function defaultValues(defaultValues) {
    return function (source) {
        return new rxjs_1.Observable(function (subscriber) {
            var isEmpty = true;
            return source.subscribe(function (x) {
                isEmpty = false;
                subscriber.next(x);
            }, function (err) { return subscriber.error(err); }, function () {
                if (isEmpty) {
                    defaultValues.forEach(function (v) { return subscriber.next(v); });
                }
                subscriber.complete();
            });
        });
    };
}
/**
 * Handles an SPARQL OPTIONAL clause in the following way:
 * 1) Buffer every bindings produced by the source iterator.
 * 2) Set a flag to False if the OPTIONAL clause yield at least one set of bindings.
 * 3) When the OPTIONAL clause if evaluated, check if the flag is True.
 * 4) If the flag is True, then we output all buffered values. Otherwise, we do nothing.
 * @see {@link https://www.w3.org/TR/sparql11-query/#optionals}
 * @author Thomas Minier
 */
function optional(source, patterns, builder, context) {
    var seenBefore = [];
    var start = source
        .pipe(operators_1.tap(function (bindings) {
        seenBefore.push(bindings);
    }));
    return rxjs_1.concat(builder._buildWhere(start, patterns, context)
        .pipe(operators_1.tap(function (bindings) {
        // remove values that matches a results from seenBefore
        var index = seenBefore.findIndex(function (b) {
            return b.isSubset(bindings);
        });
        if (index >= 0) {
            seenBefore.splice(index, 1);
        }
    })), rxjs_1.from(seenBefore));
}
exports.default = optional;
