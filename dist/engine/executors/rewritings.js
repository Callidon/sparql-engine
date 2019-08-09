/* file : rewritings.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
/**
 * Create a triple pattern that matches all RDF triples in a graph
 * @private
 * @return A triple pattern that matches all RDF triples in a graph
 */
function allPattern() {
    return {
        subject: '?s',
        predicate: '?p',
        object: '?o'
    };
}
/**
 * Create a BGP that matches all RDF triples in a graph
 * @private
 * @return A BGP that matches all RDF triples in a graph
 */
function allBGP() {
    return {
        type: 'bgp',
        triples: [allPattern()]
    };
}
/**
 * Build a SPARQL GROUP that selects all RDF triples from the Default Graph or a Named Graph
 * @private
 * @param  source          - Source graph
 * @param  dataset         - RDF dataset used to select the source
 * @param  isSilent        - True if errors should not be reported
 * @param  [isWhere=false] - True if the GROUP should belong to a WHERE clause
 * @return The SPARQL GROUP clasue
 */
function buildGroupClause(source, dataset, isSilent) {
    if (source.default) {
        return allBGP();
    }
    else {
        // a SILENT modifier prevents errors when using an unknown graph
        if (!(dataset.hasNamedGraph(source.name)) && !isSilent) {
            throw new Error("Unknown Source Graph in ADD query " + source.name);
        }
        return {
            type: 'graph',
            name: source.name,
            triples: [allPattern()]
        };
    }
}
/**
 * Build a SPARQL WHERE that selects all RDF triples from the Default Graph or a Named Graph
 * @private
 * @param  source          - Source graph
 * @param  dataset         - RDF dataset used to select the source
 * @param  isSilent        - True if errors should not be reported
 * @param  [isWhere=false] - True if the GROUP should belong to a WHERE clause
 * @return The SPARQL GROUP clasue
 */
function buildWhereClause(source, dataset, isSilent) {
    if (source.default) {
        return allBGP();
    }
    else {
        // a SILENT modifier prevents errors when using an unknown graph
        if (!(dataset.hasNamedGraph(source.name)) && !isSilent) {
            throw new Error("Unknown Source Graph in ADD query " + source.name);
        }
        var bgp = {
            type: 'bgp',
            triples: [allPattern()]
        };
        return {
            type: 'graph',
            name: source.name,
            patterns: [bgp]
        };
    }
}
/**
 * Rewrite an ADD query into a INSERT query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#add
 * @param  addQuery - Parsed ADD query
 * @param  dataset - related RDF dataset
 * @return Rewritten ADD query
 */
function rewriteAdd(addQuery, dataset) {
    return {
        updateType: 'insertdelete',
        silent: addQuery.silent,
        insert: [buildGroupClause(addQuery.destination, dataset, addQuery.silent)],
        where: [buildWhereClause(addQuery.source, dataset, addQuery.silent)]
    };
}
exports.rewriteAdd = rewriteAdd;
/**
 * Rewrite a COPY query into a CLEAR + INSERT/DELETE query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#copy
 * @param copyQuery - Parsed COPY query
 * @param dataset - related RDF dataset
 * @return Rewritten COPY query, i.e., a sequence [CLEAR query, INSERT query]
 */
function rewriteCopy(copyQuery, dataset) {
    // first, build a CLEAR query to empty the destination
    var clear = {
        type: 'clear',
        silent: copyQuery.silent,
        graph: { type: 'graph' }
    };
    if (copyQuery.destination.default) {
        clear.graph.default = true;
    }
    else {
        clear.graph.type = copyQuery.destination.type;
        clear.graph.name = copyQuery.destination.name;
    }
    // then, build an INSERT query to copy the data
    var update = rewriteAdd(copyQuery, dataset);
    return [clear, update];
}
exports.rewriteCopy = rewriteCopy;
/**
 * Rewrite a MOVE query into a CLEAR + INSERT/DELETE + CLEAR query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#move
 * @param moveQuery - Parsed MOVE query
 * @param dataset - related RDF dataset
 * @return Rewritten MOVE query, i.e., a sequence [CLEAR query, INSERT query, CLEAR query]
 */
function rewriteMove(moveQuery, dataset) {
    // first, build a classic COPY query
    var _a = __read(rewriteCopy(moveQuery, dataset), 2), clear_before = _a[0], update = _a[1];
    // then, append a CLEAR query to clear the source graph
    var clear_after = {
        type: 'clear',
        silent: moveQuery.silent,
        graph: { type: 'graph' }
    };
    if (moveQuery.source.default) {
        clear_after.graph.default = true;
    }
    else {
        clear_after.graph.type = moveQuery.source.type;
        clear_after.graph.name = moveQuery.source.name;
    }
    return [clear_before, update, clear_after];
}
exports.rewriteMove = rewriteMove;
/**
 * Extract property paths triples and classic triples from a set of RDF triples.
 * It also performs a first rewriting of some property paths.
 * @param  bgp - Set of RDF triples
 * @return A tuple [classic triples, triples with property paths, set of variables added during rewriting]
 */
function extractPropertyPaths(bgp) {
    var parts = lodash_1.partition(bgp.triples, function (triple) { return typeof (triple.predicate) === 'string'; });
    var classicTriples = parts[0];
    var pathTriples = parts[1];
    var variables = [];
    if (pathTriples.length > 0) {
        // review property paths and rewrite those equivalent to a regular BGP
        var paths_1 = [];
        // first rewriting phase
        pathTriples.forEach(function (triple, tIndex) {
            var t = triple;
            // 1) unpack sequence paths into a set of RDF triples
            if (t.predicate.pathType === '/') {
                t.predicate.items.forEach(function (pred, seqIndex) {
                    var joinVar = "?seq_" + tIndex + "_join_" + seqIndex;
                    var nextJoinVar = "?seq_" + tIndex + "_join_" + (seqIndex + 1);
                    variables.push(joinVar);
                    // non-property paths triples are fed to the BGP executor
                    if (typeof (pred) === 'string') {
                        classicTriples.push({
                            subject: (seqIndex == 0) ? triple.subject : joinVar,
                            predicate: pred,
                            object: (seqIndex == t.predicate.items.length - 1) ? triple.object : nextJoinVar
                        });
                    }
                    else {
                        paths_1.push({
                            subject: (seqIndex == 0) ? triple.subject : joinVar,
                            predicate: pred,
                            object: (seqIndex == t.predicate.items.length - 1) ? triple.object : nextJoinVar
                        });
                    }
                });
            }
            else {
                paths_1.push(t);
            }
        });
        pathTriples = paths_1;
    }
    return [classicTriples, pathTriples, variables];
}
exports.extractPropertyPaths = extractPropertyPaths;
