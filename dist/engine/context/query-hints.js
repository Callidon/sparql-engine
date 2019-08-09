/* file : query-hints.ts
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
var HINT_PREFIX = 'http://callidon.github.io/sparql-engine/hints#';
/**
 * Build an URI under the <http://www.bigdata.com/queryHints#> namespace
 * @param  suffix - Suffix append to the HINT namespace
 * @return A new URI under the HINT namespace
 */
function HINT(suffix) {
    return HINT_PREFIX + suffix;
}
exports.HINT = HINT;
/**
 * Scopes of a query hint, i.e., Query or Basic Graph pattern
 */
var QUERY_HINT_SCOPE;
(function (QUERY_HINT_SCOPE) {
    QUERY_HINT_SCOPE[QUERY_HINT_SCOPE["QUERY"] = 0] = "QUERY";
    QUERY_HINT_SCOPE[QUERY_HINT_SCOPE["BGP"] = 1] = "BGP";
})(QUERY_HINT_SCOPE = exports.QUERY_HINT_SCOPE || (exports.QUERY_HINT_SCOPE = {}));
/**
 * Types of query hints
 */
var QUERY_HINT;
(function (QUERY_HINT) {
    QUERY_HINT[QUERY_HINT["USE_HASH_JOIN"] = 0] = "USE_HASH_JOIN";
    QUERY_HINT[QUERY_HINT["USE_SYMMETRIC_HASH_JOIN"] = 1] = "USE_SYMMETRIC_HASH_JOIN";
    QUERY_HINT[QUERY_HINT["SORTED_TRIPLES"] = 2] = "SORTED_TRIPLES";
})(QUERY_HINT = exports.QUERY_HINT || (exports.QUERY_HINT = {}));
var QueryHints = /** @class */ (function () {
    function QueryHints() {
        this._bgpHints = new Map();
    }
    /**
     * Clone the set of query hints
     * @return The cloned set of query hints
     */
    QueryHints.prototype.clone = function () {
        var res = new QueryHints();
        this._bgpHints.forEach(function (value, key) { return res.add(QUERY_HINT_SCOPE.BGP, key); });
        return res;
    };
    /**
     * Merge the current hints with another set of hints
     * @param  other - Query hints to merge with
     * @return The merged set of query hints
     */
    QueryHints.prototype.merge = function (other) {
        var res = this.clone();
        other._bgpHints.forEach(function (value, key) { return res.add(QUERY_HINT_SCOPE.BGP, key); });
        return res;
    };
    /**
     * Add a query hint to the set
     * @param scope - Scope of the hint (Query, BGP, etc)
     * @param hint - Type of hint
     */
    QueryHints.prototype.add = function (scope, hint) {
        if (scope === QUERY_HINT_SCOPE.BGP) {
            this._bgpHints.set(hint, true);
        }
    };
    /**
     * Test if a hint exists
     * @param scope - Scope of the hint (Query, BGP, etc)
     * @param hint - Type of hint
     * @return True if the hint exists, False otherwise
     */
    QueryHints.prototype.has = function (scope, hint) {
        if (scope === QUERY_HINT_SCOPE.BGP) {
            return this._bgpHints.has(hint);
        }
        return false;
    };
    /**
     * Serialize the set of query hints into a string
     * @return A string which represents the set of query hints
     */
    QueryHints.prototype.toString = function () {
        var res = '';
        this._bgpHints.forEach(function (value, key) {
            switch (key) {
                case QUERY_HINT.USE_SYMMETRIC_HASH_JOIN:
                    res += "<" + HINT('BGP') + "> <" + HINT('SymmetricHashJoin') + "> \"true\"^^<http://www.w3.org/2001/XMLSchema#boolean> .\n";
                    break;
                default:
                    res += "<" + HINT('BGP') + "> _:" + key + " \"" + value + "\".\n";
                    break;
            }
        });
        return res;
    };
    return QueryHints;
}());
exports.QueryHints = QueryHints;
function parseHints(bgp, previous) {
    var res = new QueryHints();
    var regularTriples = [];
    bgp.forEach(function (triple) {
        if (triple.subject.startsWith(HINT_PREFIX)) {
            if (triple.subject === HINT('Group')) {
                switch (triple.predicate) {
                    case HINT('HashJoin'):
                        res.add(QUERY_HINT_SCOPE.BGP, QUERY_HINT.USE_HASH_JOIN);
                        break;
                    case HINT('SymmetricHashJoin'):
                        res.add(QUERY_HINT_SCOPE.BGP, QUERY_HINT.USE_SYMMETRIC_HASH_JOIN);
                        break;
                    default:
                        break;
                }
            }
        }
        else {
            regularTriples.push(triple);
        }
    });
    if (previous !== null && previous !== undefined) {
        res = res.merge(previous);
    }
    return [regularTriples, res];
}
exports.parseHints = parseHints;
