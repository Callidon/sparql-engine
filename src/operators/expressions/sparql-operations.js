/* file : sparql-operations.js
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

'use strict'

const N3Util = require('n3').Util
const { parseTerm } = require('../../utils.js').rdf
const { isNull, isString } = require('lodash')

/**
 * Implementation of SPARQL operations found in FILTERS
 * All arguments are pre-compiled from string to Javascript native type (string, number, etc)
 * based on the RDF terms nature and Literal's datatype, e.g., xsd:integers are parsed to Integer.
 * Thus, there is no need to do additional parsing on arguments.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
const SPARQL_OPERATIONS = {
  '+': function (a, b) {
    return a + b
  },

  '-': function (a, b) {
    return a - b
  },

  '*': function (a, b) {
    return a * b
  },

  '/': function (a, b) {
    return a / b
  },

  '=': function (a, b) {
    return a === b
  },

  '!=': function (a, b) {
    return a !== b
  },

  '<': function (a, b) {
    return a < b
  },

  '<=': function (a, b) {
    return a <= b
  },

  '>': function (a, b) {
    return a > b
  },

  '>=': function (a, b) {
    return a >= b
  },

  '!': function (a) {
    return !a
  },

  '&&': function (a, b) {
    return a && b
  },

  '||': function (a, b) {
    return a || b
  },

  'lang': function (a) {
    return `"${N3Util.getLiteralLanguage(a).toLowerCase()}"`
  },

  'langmatches': function (langTag, langRange) {
    // Implements https://tools.ietf.org/html/rfc4647#section-3.3.1
    langTag = langTag.toLowerCase().replace(/^"(.*)"$/, '$1')
    langRange = langRange.toLowerCase().replace(/^"(.*)"$/, '$1')
    return langTag === langRange ||
           (langRange = N3Util.getLiteralValue(langRange)) === '*' ||
           langTag.substr(1, langRange.length + 1) === langRange + '-'
  },

  'contains': function (string, substring) {
    const a = String(parseTerm(string).value)
    const b = String(parseTerm(substring).value)
    return a.indexOf(b) >= 0
  },

  'strstarts': function (string, substring) {
    const a = String(parseTerm(string).value)
    const b = String(parseTerm(substring).value)
    return a.startsWith(b)
  },

  'strends': function (string, substring) {
    const a = String(parseTerm(string).value)
    const b = String(parseTerm(substring).value)
    return a.endsWith(b)
  },

  'regex': function (subject, pattern) {
    return new RegExp(pattern).test(subject)
  },

  'str': function (a) {
    return N3Util.isLiteral(a) ? a : '"' + a + '"'
  },

  'http://www.w3.org/2001/XMLSchema#integer': function (a) {
    return '"' + Math.floor(a) + '"^^http://www.w3.org/2001/XMLSchema#integer'
  },

  'http://www.w3.org/2001/XMLSchema#double': function (a) {
    a = a.toFixed()
    if (a.indexOf('.') < 0) a += '.0'
    return '"' + a + '"^^http://www.w3.org/2001/XMLSchema#double'
  },

  'bound': function (a) {
    return !isNull(a)
  },

  'isiri': function (a) {
    return N3Util.isIRI(a)
  },

  'isblank': function (a) {
    return N3Util.isBlank(a)
  },

  'isliteral': function (a) {
    return !N3Util.isIRI(a) && !N3Util.isBlank(a)
  },

  'isnumeric': function (a) {
    return !isNaN(Number(a))
  },

  'abs': function (a) {
    return Math.abs(Number(a))
  },

  'ceil': function (a) {
    return Math.ceil(Number(a))
  },

  'floor': function (a) {
    return Math.floor(Number(a))
  },

  'round': function (a) {
    return Math.round(Number(a))
  },

  'sameterm': function (a, b) {
    // is one of the Term is alreay parsed, no need to parse it again
    if ((!isString(a)) || (!isString(b))) {
      return a === b
    }
    a = parseTerm(a)
    b = parseTerm(b)
    if (a.type !== b.type) {
      return false
    }
    switch (a.type) {
      case 'iri':
      case 'literal':
        return a.value === b.value
      case 'literal+type':
        return a.value === b.value && a.datatype === b.datatype
      case 'literal+lang':
        return a.value === b.value && a.lang === b.lang
      default:
        return false
    }
  },

  'in': function (a, b) {
    return b.some(elt => a === b)
  },

  'notin': function (a, b) {
    return !b.some(elt => a === b)
  }
}

module.exports = SPARQL_OPERATIONS
