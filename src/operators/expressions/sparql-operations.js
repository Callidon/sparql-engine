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
const { RDF, XSD } = require('../../utils.js').rdf
const terms = require('../../rdf-terms.js')
const { isNull } = require('lodash')

/**
 * Implementation of SPARQL operations found in FILTERS
 * All arguments are pre-compiled from string to an intermediate representation.
 * All possible intermediate representation are gathered in the `src/rdf-terms.js` file,
 * and are used to represents RDF Terms.
 * Each SPARQL operation is also expected to return the same kind of intermediate representation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
const SPARQL_OPERATIONS = {
  '+': function (a, b) {
    return terms.NumericOperation(a.asJS + b.asJS, a.datatype)
  },

  '-': function (a, b) {
    return terms.NumericOperation(a.asJS - b.asJS, a.datatype)
  },

  '*': function (a, b) {
    return terms.NumericOperation(a.asJS * b.asJS, a.datatype)
  },

  '/': function (a, b) {
    return terms.NumericOperation(a.asJS / b.asJS, a.datatype)
  },

  '=': function (a, b) {
    return terms.BooleanDescriptor(a.asJS === b.asJS)
  },

  '!=': function (a, b) {
    return terms.BooleanDescriptor(a.asJS !== b.asJS)
  },

  '<': function (a, b) {
    return terms.BooleanDescriptor(a.asJS < b.asJS)
  },

  '<=': function (a, b) {
    return terms.BooleanDescriptor(a.asJS <= b.asJS)
  },

  '>': function (a, b) {
    return terms.BooleanDescriptor(a.asJS > b.asJS)
  },

  '>=': function (a, b) {
    return terms.BooleanDescriptor(a.asJS >= b.asJS)
  },

  '!': function (a) {
    return terms.BooleanDescriptor(!a.asJS)
  },

  '&&': function (a, b) {
    return terms.BooleanDescriptor(a.asJS && b.asJS)
  },

  '||': function (a, b) {
    return terms.BooleanDescriptor(a.asJS || b.asJS)
  },

  'lang': function (a) {
    if (a.type === 'literal+lang') {
      return terms.RawLiteralDescriptor(a.lang.toLowerCase())
    }
    return terms.RawLiteralDescriptor('')
  },

  'langmatches': function (langTag, langRange) {
    // Implements https://tools.ietf.org/html/rfc4647#section-3.3.1
    langTag = langTag.value.toLowerCase()
    langRange = langRange.value.toLowerCase()
    const test = langTag === langRange ||
                  langRange === '*' ||
                  langTag.substr(1, langRange.length + 1) === langRange + '-'
    return terms.BooleanDescriptor(test)
  },

  'contains': function (string, substring) {
    const a = string.value
    const b = substring.value
    return terms.BooleanDescriptor(a.indexOf(b) >= 0)
  },

  'strstarts': function (string, substring) {
    const a = string.value
    const b = substring.value
    return terms.BooleanDescriptor(a.startsWith(b))
  },

  'strends': function (string, substring) {
    const a = string.value
    const b = substring.value
    return terms.BooleanDescriptor(a.endsWith(b))
  },

  'regex': function (subject, pattern) {
    return new RegExp(pattern).test(subject)
  },

  'str': function (a) {
    return a.type.startsWith('literal') ? a : terms.RawLiteralDescriptor(a)
  },

  'http://www.w3.org/2001/XMLSchema#integer': function (a) {
    return terms.NumericOperation(Math.floor(a.asJS), XSD('integer'))
  },

  'http://www.w3.org/2001/XMLSchema#double': function (a) {
    a = a.value.toFixed()
    if (a.indexOf('.') < 0) a += '.0'
    return terms.NumericOperation(a, XSD('double'))
  },

  'bound': function (a) {
    return terms.BooleanDescriptor(!isNull(a))
  },

  'isiri': function (a) {
    return terms.BooleanDescriptor(a.type === 'iri')
  },

  'isblank': function (a) {
    return terms.BooleanDescriptor(a.type === 'bnode')
  },

  'isliteral': function (a) {
    return terms.BooleanDescriptor(a.type === 'literal' || a.type === 'literal+type' || a.type === 'literal+lang')
  },

  'isnumeric': function (a) {
    return terms.BooleanDescriptor(!isNaN(a.asJS))
  },

  'abs': function (a) {
    return terms.NumericOperation(Math.abs(a.asJS), XSD('integer'))
  },

  'ceil': function (a) {
    return terms.NumericOperation(Math.ceil(a.asJS), XSD('integer'))
  },

  'floor': function (a) {
    return terms.NumericOperation(Math.floor(a.asJS), XSD('integer'))
  },

  'round': function (a) {
    return terms.NumericOperation(Math.round(a.asJS), XSD('integer'))
  },

  'sameterm': function (a, b) {
    // is one of the Term is alreay parsed, no need to parse it again
    if (a.type !== b.type) {
      return terms.BooleanDescriptor(false)
    }
    switch (a.type) {
      case 'iri':
      case 'literal':
        return terms.BooleanDescriptor(a.value === b.value)
      case 'literal+type':
        return terms.BooleanDescriptor(a.value === b.value && a.datatype === b.datatype)
      case 'literal+lang':
        return terms.BooleanDescriptor(a.value === b.value && a.lang === b.lang)
      default:
        return terms.BooleanDescriptor(false)
    }
  },

  'in': function (a, b) {
    return terms.BooleanDescriptor(b.some(elt => a.asJS === b.asJS))
  },

  'notin': function (a, b) {
    return terms.BooleanDescriptor(!b.some(elt => a.asJS === b.asJS))
  },

  'datatype': function (a) {
    switch (a.type) {
      case 'literal':
        return terms.IRIDescriptor(XSD('string'))
      case 'literal+type':
        return terms.IRIDescriptor(a.datatype)
      case 'literal+lang':
        return terms.IRIDescriptor(RDF('langString'))
      default:
        return terms.RawLiteralDescriptor('')
    }
  }
}

module.exports = SPARQL_OPERATIONS
