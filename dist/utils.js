/* file : utils.ts
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
var rdf_terms_1 = require("./rdf-terms");
var n3_1 = require("n3");
var operators_1 = require("rxjs/operators");
/**
 * Remove surrounding brackets from an IRI
 * @private
 * @param iri - IRI to cleanup
 * @return Transformed IRI
 */
function cleanIRI(iri) {
    if (iri.startsWith('<') && iri.endsWith('>')) {
        return iri.slice(1, iri.length - 1);
    }
    return iri;
}
/**
 * RDF related utilities
 */
var rdf;
(function (rdf) {
    /**
     * Parse a RDF term in string format and return a descriptor with its type and value
     * @param  {string} term - The RDF Term in string format (i.e., URI or Literal)
     * @return A descriptor for the term
     * @throws {SyntaxError} Thrown if an unknown RDF Term is encoutered during parsing
     */
    function parseTerm(term) {
        var parsed = null;
        if (n3_1.Util.isIRI(term)) {
            parsed = rdf_terms_1.terms.createIRI(term);
        }
        else if (n3_1.Util.isLiteral(term)) {
            var value = n3_1.Util.getLiteralValue(term);
            var lang = n3_1.Util.getLiteralLanguage(term);
            var type = cleanIRI(n3_1.Util.getLiteralType(term));
            if (lang !== null && lang !== undefined && lang !== '') {
                parsed = rdf_terms_1.terms.createLangLiteral(value, lang);
            }
            else if (term.indexOf('^^') > -1) {
                parsed = rdf_terms_1.terms.createTypedLiteral(value, type);
            }
            else {
                parsed = rdf_terms_1.terms.createLiteral(value);
            }
        }
        else {
            throw new SyntaxError("Unknown RDF Term encoutered during parsing: " + term);
        }
        return parsed;
    }
    rdf.parseTerm = parseTerm;
    /**
     * Create a RDF triple in Object representation
     * @param  {string} subj - Triple's subject
     * @param  {string} pred - Triple's predicate
     * @param  {string} obj  - Triple's object
     * @return A RDF triple in Object representation
     */
    function triple(subj, pred, obj) {
        return {
            subject: subj,
            predicate: pred,
            object: obj
        };
    }
    rdf.triple = triple;
    /**
     * Count the number of variables in a Triple Pattern
     * @param  {Object} triple - Triple Pattern to process
     * @return The number of variables in the Triple Pattern
     */
    function countVariables(triple) {
        var count = 0;
        if (isVariable(triple.subject)) {
            count++;
        }
        if (isVariable(triple.predicate)) {
            count++;
        }
        if (isVariable(triple.object)) {
            count++;
        }
        return count;
    }
    rdf.countVariables = countVariables;
    /**
     * Return True if a string is a SPARQL variable
     * @param  {string}  str - String to test
     * @return True if the string is a SPARQL variable, False otherwise
     */
    function isVariable(str) {
        if (typeof str !== 'string') {
            return false;
        }
        return str.startsWith('?');
    }
    rdf.isVariable = isVariable;
    /**
     * Create an IRI under the XSD namespace
     * @param suffix - Suffix appended to the XSD namespace to create an IRI
     * @return An new IRI, under the XSD namespac
     */
    function XSD(suffix) {
        return "http://www.w3.org/2001/XMLSchema#" + suffix;
    }
    rdf.XSD = XSD;
    /**
     * Create an IRI under the RDF namespace
     * @param suffix - Suffix appended to the RDF namespace to create an IRI
     * @return An new IRI, under the RDF namespac
     */
    function RDF(suffix) {
        return "http://www.w3.org/1999/02/22-rdf-syntax-ns#" + suffix;
    }
    rdf.RDF = RDF;
})(rdf = exports.rdf || (exports.rdf = {}));
/**
 * Bound a triple pattern using a set of bindings, i.e., substitute variables in the triple pattern
 * using the set of bindings provided
 * @param triple  - Triple pattern
 * @param bindings - Set of bindings
 * @return An new, bounded triple pattern
 */
function applyBindings(triple, bindings) {
    var newTriple = Object.assign({}, triple);
    if (triple.subject.startsWith('?') && bindings.has(triple.subject)) {
        newTriple.subject = bindings.get(triple.subject);
    }
    if (triple.predicate.startsWith('?') && bindings.has(triple.predicate)) {
        newTriple.predicate = bindings.get(triple.predicate);
    }
    if (triple.object.startsWith('?') && bindings.has(triple.object)) {
        newTriple.object = bindings.get(triple.object);
    }
    return newTriple;
}
exports.applyBindings = applyBindings;
/**
 * Recursively apply bindings to every triple in a SPARQL group pattern
 * @param  {Object} group - SPARQL group pattern to process
 * @param  {Bindings} bindings - Set of bindings to use
 * @return A new SPARQL group pattern with triples bounded
 */
function deepApplyBindings(group, bindings) {
    switch (group.type) {
        case 'bgp':
            // WARNING property paths are not supported here
            var triples = group.triples;
            var bgp = {
                type: 'bgp',
                triples: triples.map(function (t) { return bindings.bound(t); })
            };
            return bgp;
        case 'group':
        case 'optional':
        case 'service':
        case 'union':
            var newGroup = {
                type: group.type,
                patterns: group.patterns.map(function (g) { return deepApplyBindings(g, bindings); })
            };
            return newGroup;
        case 'query':
            var subQuery = group;
            subQuery.where = subQuery.where.map(function (g) { return deepApplyBindings(g, bindings); });
            return subQuery;
        default:
            return group;
    }
}
exports.deepApplyBindings = deepApplyBindings;
/**
 * Extends all set of bindings produced by an iterator with another set of bindings
 * @param  source - Source terator
 * @param  bindings - Bindings added to each set of bindings procuded by the iterator
 * @return An iterator that extends bindins produced by the source iterator
 */
function extendByBindings(source, bindings) {
    return source.pipe(operators_1.map(function (b) { return bindings.union(b); }));
}
exports.extendByBindings = extendByBindings;
