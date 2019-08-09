/* file : rdf-terms.ts
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
var moment_1 = require("moment");
var utils_1 = require("./utils");
/**
 * Parse a RDF Literal to its Javascript representation
 * See https://www.w3.org/TR/rdf11-concepts/#section-Datatypes for more details.
 * @param value - Literal value
 * @param type - Literal datatype
 * @return Javascript representation of the literal
 */
function literalToJS(value, type) {
    switch (type) {
        case utils_1.rdf.XSD('integer'):
        case utils_1.rdf.XSD('byte'):
        case utils_1.rdf.XSD('short'):
        case utils_1.rdf.XSD('int'):
        case utils_1.rdf.XSD('unsignedByte'):
        case utils_1.rdf.XSD('unsignedShort'):
        case utils_1.rdf.XSD('unsignedInt'):
        case utils_1.rdf.XSD('number'):
        case utils_1.rdf.XSD('float'):
        case utils_1.rdf.XSD('decimal'):
        case utils_1.rdf.XSD('double'):
        case utils_1.rdf.XSD('long'):
        case utils_1.rdf.XSD('unsignedLong'):
        case utils_1.rdf.XSD('positiveInteger'):
        case utils_1.rdf.XSD('nonPositiveInteger'):
        case utils_1.rdf.XSD('negativeInteger'):
        case utils_1.rdf.XSD('nonNegativeInteger'):
            return Number(value);
        case utils_1.rdf.XSD('boolean'):
            return value === '"true"' || value === '"1"';
        case utils_1.rdf.XSD('dateTime'):
        case utils_1.rdf.XSD('dateTimeStamp'):
        case utils_1.rdf.XSD('date'):
        case utils_1.rdf.XSD('time'):
        case utils_1.rdf.XSD('duration'):
            return moment_1.parseZone(value);
        case utils_1.rdf.XSD('hexBinary'):
            return Buffer.from(value, 'hex');
        case utils_1.rdf.XSD('base64Binary'):
            return Buffer.from(value, 'base64');
        default:
            return value;
    }
}
/**
 * Utilities used to manipulate RDF terms
 * @param  iri [description]
 * @return     [description]
 */
var terms;
(function (terms) {
    /**
     * Creates an IRI in {@link RDFTerm} format
     * @see https://www.w3.org/TR/rdf11-concepts/#section-IRIs
     * @param iri - IRI
     * @return A new IRI in {@link RDFTerm} format
     */
    function createIRI(iri) {
        return {
            type: 'iri',
            value: iri,
            asRDF: iri,
            asJS: iri
        };
    }
    terms.createIRI = createIRI;
    /**
     * Creates a Literal in {@link RDFTerm} format
     * @see https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
     * @param literal - Literal
     * @return A new Literal in {@link RDFTerm} format
     */
    function createLiteral(literal) {
        var rdf = "\"" + literal + "\"";
        return {
            type: 'literal',
            value: literal,
            asRDF: rdf,
            asJS: rdf
        };
    }
    terms.createLiteral = createLiteral;
    /**
     * Creates a Literal with a datatype, in {@link RDFTerm} format
     * @see https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
     * @param literal - Literal
     * @param type - Literal datatype
     * @return A new typed Literal in {@link RDFTerm} format
     */
    function createTypedLiteral(literal, type) {
        return {
            type: 'literal+type',
            value: literal,
            datatype: type,
            asRDF: "\"" + literal + "\"^^" + type,
            asJS: literalToJS(literal, type)
        };
    }
    terms.createTypedLiteral = createTypedLiteral;
    /**
     * Creates a Literal with a language tag, in {@link RDFTerm} format
     * @see https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
     * @param literal - Literal
     * @param lang - Language tag
     * @return A new tagged Literal in {@link RDFTerm} format
     */
    function createLangLiteral(literal, lang) {
        var rdf = "\"" + literal + "\"@" + lang;
        return {
            type: 'literal+lang',
            value: literal,
            lang: lang,
            asRDF: rdf,
            asJS: rdf
        };
    }
    terms.createLangLiteral = createLangLiteral;
    /**
     * Creates a Literal from a boolean, in {@link RDFTerm} format
     * @param value - Boolean
     * @return A new typed Literal in {@link RDFTerm} format
     */
    function createBoolean(value) {
        return {
            type: 'literal+type',
            value: "\"" + value + "\"",
            datatype: 'http://www.w3.org/2001/XMLSchema#boolean',
            asRDF: "\"" + value + "\"^^http://www.w3.org/2001/XMLSchema#boolean",
            asJS: value
        };
    }
    terms.createBoolean = createBoolean;
    /**
     * Creates a Literal from a number, in {@link RDFTerm} format
     * @param value - Number
     * @param type - Literal type
     * @return A new typed Literal in {@link RDFTerm} format
     */
    function createNumber(value, type) {
        return {
            type: 'literal+type',
            value: value.toString(),
            datatype: type,
            asRDF: "\"" + value + "\"^^" + type,
            asJS: value
        };
    }
    terms.createNumber = createNumber;
    /**
     * Creates a Literal from a Moment date, in {@link RDFTerm} format
     * @param date - A Date, in Moment format
     * @return A new typed Literal in {@link RDFTerm} format
     */
    function createDate(date) {
        var value = date.toISOString();
        return {
            type: 'literal+type',
            value: value,
            datatype: 'http://www.w3.org/2001/XMLSchema#dateTime',
            asRDF: "\"" + value + "\"^^http://www.w3.org/2001/XMLSchema#dateTime",
            asJS: date
        };
    }
    terms.createDate = createDate;
    /**
     * Clone a literal and replace its value with another one
     * @param  base     - Literal to clone
     * @param  newValue - New literal value
     * @return The literal with its new value
     */
    function replaceLiteralValue(term, newValue) {
        switch (term.type) {
            case 'literal+type':
                return createTypedLiteral(newValue, term.datatype);
            case 'literal+lang':
                return createLangLiteral(newValue, term.lang);
            default:
                return createLiteral(newValue);
        }
    }
    terms.replaceLiteralValue = replaceLiteralValue;
    /**
     * Test if Two RDF Terms are equals
     * @see https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
     * @param left - Left Term
     * @param right - Right term
     * @return A RDF Literal with the results of the test (True or False)
     */
    function equals(left, right) {
        if (left.type !== right.type) {
            return createBoolean(false);
        }
        switch (left.type) {
            case 'iri':
            case 'literal':
                return createBoolean(left.value === right.value);
            case 'literal+type':
                return createBoolean(left.value === right.value && left.datatype === right.datatype);
            case 'literal+lang':
                return createBoolean(left.value === right.value && left.lang === right.lang);
            default:
                return createBoolean(false);
        }
    }
    terms.equals = equals;
    /**
     * Test if a RDF Term is an IRI
     * @param  term - RDF Term to test
     * @return True if the term is an IRI, False otherwise
     */
    function isIRI(term) {
        return term.type === 'iri';
    }
    terms.isIRI = isIRI;
    /**
     * Test if a RDF Term is a Literal (regardless of the lang/datatype)
     * @param  term - RDF Term to test
     * @return True if the term is a Literal, False otherwise
     */
    function isLiteral(term) {
        return term.type.startsWith('literal');
    }
    terms.isLiteral = isLiteral;
    /**
     * Test if a RDF Term is a Literal with a datatype
     * @param  term - RDF Term to test
     * @return True if the term is a Literal with a datatype, False otherwise
     */
    function isTypedLiteral(term) {
        return term.type === 'literal+type';
    }
    terms.isTypedLiteral = isTypedLiteral;
    /**
     * Test if a RDF Term is a Literal with a language
     * @param  term - RDF Term to test
     * @return True if the term is a Literal with a language, False otherwise
     */
    function isLangLiteral(term) {
        return term.type === 'literal+lang';
    }
    terms.isLangLiteral = isLangLiteral;
    /**
     * Test if a RDF Term is a Date literal
     * @param  literal - RDF Term to test
     * @return True if the term is a Date literal, False otherwise
     */
    function isDate(literal) {
        return literal.type === 'literal+type' && literal.datatype === utils_1.rdf.XSD('dateTime');
    }
    terms.isDate = isDate;
    /**
     * Test if a RDF Term is a Number literal (float, int, etc)
     * @param  literal - RDF Term to test
     * @return True if the term is a Number literal, False otherwise
     */
    function isNumber(term) {
        if (term.type !== 'literal+type') {
            return false;
        }
        var literal = term;
        switch (literal.type) {
            case utils_1.rdf.XSD('integer'):
            case utils_1.rdf.XSD('byte'):
            case utils_1.rdf.XSD('short'):
            case utils_1.rdf.XSD('int'):
            case utils_1.rdf.XSD('unsignedByte'):
            case utils_1.rdf.XSD('unsignedShort'):
            case utils_1.rdf.XSD('unsignedInt'):
            case utils_1.rdf.XSD('number'):
            case utils_1.rdf.XSD('float'):
            case utils_1.rdf.XSD('decimal'):
            case utils_1.rdf.XSD('double'):
            case utils_1.rdf.XSD('long'):
            case utils_1.rdf.XSD('unsignedLong'):
            case utils_1.rdf.XSD('positiveInteger'):
            case utils_1.rdf.XSD('nonPositiveInteger'):
            case utils_1.rdf.XSD('negativeInteger'):
            case utils_1.rdf.XSD('nonNegativeInteger'):
                return true;
            default:
                return false;
        }
    }
    terms.isNumber = isNumber;
})(terms = exports.terms || (exports.terms = {}));
