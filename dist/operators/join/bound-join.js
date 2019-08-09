"use strict";
/* file : bound-join.ts
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
var utils_1 = require("../../utils");
var BIND_JOIN_BUFFER_SIZE = 15;
/**
 * Rewrite a triple pattern using a rewriting key, i.e., append "_key" to each SPARQL variable in the triple pattern
 * @private
 * @param key - Rewriting key
 * @param tp - Triple pattern to rewrite
 * @return The rewritten triple pattern
 */
function rewriteTriple(triple, key) {
    var res = Object.assign({}, triple);
    if (utils_1.rdf.isVariable(triple.subject)) {
        res.subject = triple.subject + '_' + key;
    }
    if (utils_1.rdf.isVariable(triple.predicate)) {
        res.predicate = triple.predicate + '_' + key;
    }
    if (utils_1.rdf.isVariable(triple.object)) {
        res.object = triple.object + '_' + key;
    }
    return res;
}
/**
 * Find a rewriting key in a list of variables
 * For example, in [ ?s, ?o_1 ], the rewriting key is 1
 * @private
 */
function findKey(variables, maxValue) {
    var e_1, _a;
    if (maxValue === void 0) { maxValue = 15; }
    var key = -1;
    try {
        for (var variables_1 = __values(variables), variables_1_1 = variables_1.next(); !variables_1_1.done; variables_1_1 = variables_1.next()) {
            var v = variables_1_1.value;
            for (var i = 0; i < maxValue; i++) {
                if (v.endsWith('_' + i)) {
                    return i;
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (variables_1_1 && !variables_1_1.done && (_a = variables_1.return)) _a.call(variables_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return key;
}
/**
 * Undo the bound join rewriting on solutions bindings, e.g., rewrite all variables "?o_1" to "?o"
 * @private
 */
function revertBinding(key, input, variables) {
    var e_2, _a;
    var newBinding = input.empty();
    try {
        for (var variables_2 = __values(variables), variables_2_1 = variables_2.next(); !variables_2_1.done; variables_2_1 = variables_2.next()) {
            var vName = variables_2_1.value;
            if (vName.endsWith('_' + key)) {
                var index = vName.indexOf('_' + key);
                newBinding.set(vName.substring(0, index), input.get(vName));
            }
            else {
                newBinding.set(vName, input.get(vName));
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (variables_2_1 && !variables_2_1.done && (_a = variables_2.return)) _a.call(variables_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return newBinding;
}
/**
 * Undo the rewriting on solutions bindings, and then merge each of them with the corresponding input binding
 * @private
 */
function rewriteSolutions(bindings, rewritingMap) {
    var key = findKey(bindings.variables());
    // rewrite binding, and then merge it with the corresponding one in the bucket
    var newBinding = revertBinding(key, bindings, bindings.variables());
    if (rewritingMap.has(key)) {
        newBinding = newBinding.union(rewritingMap.get(key));
    }
    return newBinding;
}
/**
 * A special operator used to evaluate a UNION query with a Sage server,
 * and then rewrite bindings generated and performs union with original bindings.
 * @author Thomas Minier
 * @private
 * @param  graph - Graph queried
 * @param  bgpBucket - List of BGPs to evaluate
 * @param  rewritingTable - Map <rewriting key -> original bindings>
 * @param  options - Query execution option
 * @return An Observable which evaluates the query.
 */
function rewritingOp(graph, bgpBucket, rewritingTable, context) {
    return rxjs_1.from(graph.evalUnion(bgpBucket, context))
        .pipe(operators_1.map(function (bindings) {
        var x = rewriteSolutions(bindings, rewritingTable);
        return x;
    }));
}
/**
 * Performs a Bound Join
 * see https://link.springer.com/content/pdf/10.1007/978-3-642-25073-6_38.pdf for more details
 * @author Thomas Minier
 * @param  source - Source of bindings
 * @param  bgp - Basic Pattern to join with
 * @param  graph - Graphe queried
 * @param  options - Query execution options
 * @return An observable which evaluates the bound join
 */
function boundJoin(source, bgp, graph, context) {
    return new rxjs_1.Observable(function (observer) {
        var sourceClosed = false;
        var activeIterators = 0;
        // utility function used to close the observable
        function tryClose() {
            activeIterators--;
            if (sourceClosed && activeIterators === 0) {
                observer.complete();
            }
        }
        return source
            .pipe(operators_1.bufferCount(BIND_JOIN_BUFFER_SIZE))
            .subscribe({
            next: function (bucket) {
                activeIterators++;
                // simple case: first join in the pipeline
                if (bucket.length === 1 && bucket[0].isEmpty) {
                    rxjs_1.from(graph.evalBGP(bgp, context)).subscribe(function (b) {
                        observer.next(b);
                    }, function (err) { return observer.error(err); }, function () { return tryClose(); });
                }
                else {
                    // create bound join and execute it
                    var bgpBucket_1 = [];
                    var rewritingTable_1 = new Map();
                    var key_1 = 0;
                    // build the BGP bucket
                    bucket.map(function (binding) {
                        var boundedBGP = [];
                        bgp.forEach(function (triple) {
                            var boundedTriple = binding.bound(triple);
                            // rewrite triple and registerthe rewiriting
                            boundedTriple = rewriteTriple(boundedTriple, key_1);
                            rewritingTable_1.set(key_1, binding);
                            boundedBGP.push(boundedTriple);
                        });
                        bgpBucket_1.push(boundedBGP);
                        key_1++;
                    });
                    // execute the bucket
                    rewritingOp(graph, bgpBucket_1, rewritingTable_1, context)
                        .subscribe(function (b) { return observer.next(b); }, function (err) { return observer.error(err); }, function () { return tryClose(); });
                }
            },
            error: function (err) { return observer.error(err); },
            complete: function () { sourceClosed = true; }
        });
    });
}
exports.default = boundJoin;
