/* file : sparql-operations.ts
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
var utils_1 = require("../../utils");
var rdf_terms_1 = require("../../rdf-terms");
var moment = require("moment");
var uuid = require("uuid/v4");
var lodash_1 = require("lodash");
var crypto = require("crypto");
/**
 * Return a high-orderpply a Hash function  to a RDF
 * and returns the corresponding RDF Literal
 * @param  {string} hashType - Type of hash (md5, sha256, etc)
 * @return {function} A function that hashes RDF term
 */
function applyHash(hashType) {
    return function (v) {
        var hash = crypto.createHash(hashType);
        hash.update(v.value);
        return rdf_terms_1.terms.createLiteral(hash.digest('hex'));
    };
}
/**
 * Implementation of SPARQL operations found in FILTERS
 * All arguments are pre-compiled from string to an intermediate representation.
 * All possible intermediate representation are gathered in the `src/rdf-terms.js` file,
 * and are used to represents RDF Terms.
 * Each SPARQL operation is also expected to return the same kind of intermediate representation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
exports.default = {
    /*
      XQuery & XPath functions https://www.w3.org/TR/sparql11-query/#OperatorMapping
    */
    '+': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) || rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createDate(a.asJS + b.asJS);
        }
        else if (a.type === 'literal+type' && b.type === 'literal+type') {
            return rdf_terms_1.terms.createNumber(a.asJS + b.asJS, a.datatype);
        }
        return rdf_terms_1.terms.createLiteral(a.asJS + b.asJS);
    },
    '-': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) || rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createDate(moment(a.asJS - b.asJS));
        }
        else if (a.type === 'literal+type' && b.type === 'literal+type') {
            return rdf_terms_1.terms.createNumber(a.asJS - b.asJS, a.datatype);
        }
        return rdf_terms_1.terms.createLiteral('');
    },
    '*': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) || rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createDate(moment(a.asJS * b.asJS));
        }
        else if (a.type === 'literal+type' && b.type === 'literal+type') {
            return rdf_terms_1.terms.createNumber(a.asJS * b.asJS, a.datatype);
        }
        return rdf_terms_1.terms.createLiteral('');
    },
    '/': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) || rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createDate(moment(a.asJS / b.asJS));
        }
        else if (a.type === 'literal+type' && b.type === 'literal+type') {
            return rdf_terms_1.terms.createNumber(a.asJS / b.asJS, a.datatype);
        }
        return rdf_terms_1.terms.createLiteral('');
    },
    '=': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) && rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createBoolean(a.asJS.isSame(b.asJS));
        }
        return rdf_terms_1.terms.equals(a, b);
    },
    '!=': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) && rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createBoolean(!(a.asJS.isSame(b.asJS)));
        }
        return rdf_terms_1.terms.createBoolean(a.asJS !== b.asJS);
    },
    '<': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) && rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createBoolean(a.asJS.isBefore(b.asJS));
        }
        return rdf_terms_1.terms.createBoolean(a.asJS < b.asJS);
    },
    '<=': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) && rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createBoolean(a.asJS.isSameOrBefore(b.asJS));
        }
        return rdf_terms_1.terms.createBoolean(a.asJS <= b.asJS);
    },
    '>': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) && rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createBoolean(a.asJS.isAfter(b.asJS));
        }
        return rdf_terms_1.terms.createBoolean(a.asJS > b.asJS);
    },
    '>=': function (a, b) {
        if (rdf_terms_1.terms.isDate(a) && rdf_terms_1.terms.isDate(b)) {
            return rdf_terms_1.terms.createBoolean(a.asJS.isSameOrAfter(b.asJS));
        }
        return rdf_terms_1.terms.createBoolean(a.asJS >= b.asJS);
    },
    '!': function (a) {
        return rdf_terms_1.terms.createBoolean(!a.asJS);
    },
    '&&': function (a, b) {
        return rdf_terms_1.terms.createBoolean(a.asJS && b.asJS);
    },
    '||': function (a, b) {
        return rdf_terms_1.terms.createBoolean(a.asJS || b.asJS);
    },
    /*
      SPARQL Functional forms https://www.w3.org/TR/sparql11-query/#func-forms
    */
    'bound': function (a) {
        return rdf_terms_1.terms.createBoolean(!lodash_1.isNull(a));
    },
    'sameterm': function (a, b) {
        return rdf_terms_1.terms.equals(a, b);
    },
    'in': function (a, b) {
        return rdf_terms_1.terms.createBoolean(b.some(function (elt) { return a.asJS === elt.asJS; }));
    },
    'notin': function (a, b) {
        return rdf_terms_1.terms.createBoolean(!b.some(function (elt) { return a.asJS === elt.asJS; }));
    },
    /*
      Functions on RDF Terms https://www.w3.org/TR/sparql11-query/#func-rdfTerms
    */
    'isiri': function (a) {
        return rdf_terms_1.terms.createBoolean(a.type === 'iri');
    },
    'isblank': function (a) {
        return rdf_terms_1.terms.createBoolean(a.type === 'bnode');
    },
    'isliteral': function (a) {
        return rdf_terms_1.terms.createBoolean(a.type.startsWith('literal'));
    },
    'isnumeric': function (a) {
        return rdf_terms_1.terms.createBoolean(!isNaN(a.asJS));
    },
    'str': function (a) {
        return a.type.startsWith('literal') ? a : rdf_terms_1.terms.createLiteral(a.value);
    },
    'lang': function (a) {
        if (a.type === 'literal+lang') {
            return rdf_terms_1.terms.createLiteral(a.lang.toLowerCase());
        }
        return rdf_terms_1.terms.createLiteral('');
    },
    'datatype': function (a) {
        switch (a.type) {
            case 'literal':
                return rdf_terms_1.terms.createIRI(utils_1.rdf.XSD('string'));
            case 'literal+type':
                return rdf_terms_1.terms.createIRI(a.datatype);
            case 'literal+lang':
                return rdf_terms_1.terms.createIRI(utils_1.rdf.RDF('langString'));
            default:
                return rdf_terms_1.terms.createLiteral('');
        }
    },
    'iri': function (a) {
        return rdf_terms_1.terms.createIRI(a.value);
    },
    'strdt': function (x, datatype) {
        return rdf_terms_1.terms.createTypedLiteral(x.value, datatype.value);
    },
    'strlang': function (x, lang) {
        return rdf_terms_1.terms.createLangLiteral(x.value, lang.value);
    },
    'uuid': function () {
        return rdf_terms_1.terms.createIRI("urn:uuid:" + uuid());
    },
    'struuid': function () {
        return rdf_terms_1.terms.createLiteral(uuid());
    },
    /*
      Functions on Strings https://www.w3.org/TR/sparql11-query/#func-strings
    */
    'strlen': function (a) {
        return rdf_terms_1.terms.createNumber(a.value.length, utils_1.rdf.XSD('integer'));
    },
    'substr': function (str, index, length) {
        if (index.asJS < 1) {
            throw new Error('SUBSTR error: the index of the first character in a string is 1 (according to the SPARQL W3C specs)');
        }
        var value = str.value.substring(index.asJS - 1);
        if (length !== null && length !== undefined) {
            value = value.substring(0, length.asJS);
        }
        return rdf_terms_1.terms.replaceLiteralValue(str, value);
    },
    'ucase': function (a) {
        return rdf_terms_1.terms.replaceLiteralValue(a, a.value.toUpperCase());
    },
    'lcase': function (a) {
        return rdf_terms_1.terms.replaceLiteralValue(a, a.value.toLowerCase());
    },
    'strstarts': function (string, substring) {
        var a = string.value;
        var b = substring.value;
        return rdf_terms_1.terms.createBoolean(a.startsWith(b));
    },
    'strends': function (string, substring) {
        var a = string.value;
        var b = substring.value;
        return rdf_terms_1.terms.createBoolean(a.endsWith(b));
    },
    'contains': function (string, substring) {
        var a = string.value;
        var b = substring.value;
        return rdf_terms_1.terms.createBoolean(a.indexOf(b) >= 0);
    },
    'strbefore': function (str, token) {
        var index = str.value.indexOf(token.value);
        var value = (index > -1) ? str.value.substring(0, index) : '';
        return rdf_terms_1.terms.replaceLiteralValue(str, value);
    },
    'strafter': function (str, token) {
        var index = str.value.indexOf(token.value);
        var value = (index > -1) ? str.value.substring(index + token.value.length) : '';
        return rdf_terms_1.terms.replaceLiteralValue(str, value);
    },
    'encode_for_uri': function (a) {
        return rdf_terms_1.terms.createLiteral(encodeURIComponent(a.value));
    },
    'concat': function (a, b) {
        if (a.type !== b.type) {
            return rdf_terms_1.terms.createLiteral(a.value + b.value);
        }
        return rdf_terms_1.terms.replaceLiteralValue(a, a.value + b.value);
    },
    'langmatches': function (langTag, langRange) {
        // Implements https://tools.ietf.org/html/rfc4647#section-3.3.1
        var tag = langTag.value.toLowerCase();
        var range = langRange.value.toLowerCase();
        var test = tag === range ||
            range === '*' ||
            tag.substr(1, range.length + 1) === range + '-';
        return rdf_terms_1.terms.createBoolean(test);
    },
    'regex': function (subject, pattern, flags) {
        var regexp = (flags === null || flags === undefined) ? new RegExp(pattern.value) : new RegExp(pattern.value, flags.value);
        return rdf_terms_1.terms.createBoolean(regexp.test(subject.value));
    },
    /*
      Functions on Numerics https://www.w3.org/TR/sparql11-query/#func-numerics
    */
    'abs': function (a) {
        return rdf_terms_1.terms.createNumber(Math.abs(a.asJS), utils_1.rdf.XSD('integer'));
    },
    'round': function (a) {
        return rdf_terms_1.terms.createNumber(Math.round(a.asJS), utils_1.rdf.XSD('integer'));
    },
    'ceil': function (a) {
        return rdf_terms_1.terms.createNumber(Math.ceil(a.asJS), utils_1.rdf.XSD('integer'));
    },
    'floor': function (a) {
        return rdf_terms_1.terms.createNumber(Math.floor(a.asJS), utils_1.rdf.XSD('integer'));
    },
    /*
      Functions on Dates and Times https://www.w3.org/TR/sparql11-query/#func-date-time
    */
    'now': function () {
        return rdf_terms_1.terms.createDate(moment());
    },
    'year': function (a) {
        return rdf_terms_1.terms.createNumber(a.asJS.year(), utils_1.rdf.XSD('integer'));
    },
    'month': function (a) {
        return rdf_terms_1.terms.createNumber(a.asJS.month() + 1, utils_1.rdf.XSD('integer'));
    },
    'day': function (a) {
        return rdf_terms_1.terms.createNumber(a.asJS.date(), utils_1.rdf.XSD('integer'));
    },
    'hours': function (a) {
        return rdf_terms_1.terms.createNumber(a.asJS.hours(), utils_1.rdf.XSD('integer'));
    },
    'minutes': function (a) {
        return rdf_terms_1.terms.createNumber(a.asJS.minutes(), utils_1.rdf.XSD('integer'));
    },
    'seconds': function (a) {
        return rdf_terms_1.terms.createNumber(a.asJS.seconds(), utils_1.rdf.XSD('integer'));
    },
    'tz': function (a) {
        var offset = a.asJS.utcOffset() / 60;
        return rdf_terms_1.terms.createLiteral(offset.toString());
    },
    /*
      Hash Functions https://www.w3.org/TR/sparql11-query/#func-hash
    */
    'md5': applyHash('md5'),
    'sha1': applyHash('sha1'),
    'sha256': applyHash('sha256'),
    'sha384': applyHash('sha384'),
    'sha512': applyHash('sha512')
};
