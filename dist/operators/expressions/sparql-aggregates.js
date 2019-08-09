/* file : sparql-aggregates.ts
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
var lodash_1 = require("lodash");
/**
 * SPARQL Aggregation operations.
 * Each operation takes an arguments a SPARQL variable and a row of bindings, i.e., a list of
 * solutions bindings on which the aggregation must be applied.
 * Each operations is expected to return a term, as with classic SPARQL operations
 * @see https://www.w3.org/TR/sparql11-query/#aggregateAlgebra
 * @author Thomas Minier
 */
exports.default = {
    'count': function (variable, rows) {
        var count = 0;
        if (variable in rows) {
            count = rows[variable].map(function (v) { return v !== null; }).length;
        }
        return rdf_terms_1.terms.createNumber(count, utils_1.rdf.XSD('integer'));
    },
    'sum': function (variable, rows) {
        var sum = 0;
        if (variable in rows) {
            sum = rows[variable].reduce(function (acc, b) {
                return acc + b.asJS;
            }, 0);
        }
        return rdf_terms_1.terms.createNumber(sum, utils_1.rdf.XSD('integer'));
    },
    'avg': function (variable, rows) {
        var avg = 0;
        if (variable in rows) {
            avg = lodash_1.meanBy(rows[variable], function (v) { return v.asJS; });
        }
        return rdf_terms_1.terms.createNumber(avg, utils_1.rdf.XSD('integer'));
    },
    'min': function (variable, rows) {
        return lodash_1.minBy(rows[variable], function (v) { return v.asJS; }) || rdf_terms_1.terms.createNumber(-1, utils_1.rdf.XSD('integer'));
    },
    'max': function (variable, rows) {
        return lodash_1.maxBy(rows[variable], function (v) { return v.asJS; }) || rdf_terms_1.terms.createNumber(-1, utils_1.rdf.XSD('integer'));
    },
    'group_concat': function (variable, rows, sep) {
        var value = rows[variable].map(function (v) { return v.value; }).join(sep);
        return rdf_terms_1.terms.createLiteral(value);
    },
    'sample': function (variable, rows) {
        return lodash_1.sample(rows[variable]);
    }
};
