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

const { RDF, XSD } = require('../../utils.js').rdf
const terms = require('../../rdf-terms.js')
const moment = require('moment')
const uuid = require('uuid/v4')
const { isNull } = require('lodash')
const crypto = require('crypto')

/**
 * Test if Two RDF Terms are equal
 * @see https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
 * @param {Object} a - Left Term
 * @param {Object} b - Right term
 * @return {Object} A RDF Literal with the results of the test
 */
function RDFTermEqual (a, b) {
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
}

/**
 * Return True if a literal is a Date
 * @param  {Object}  literal - Literal to analyze
 * @return {Boolean} True if a literal is a Date, False otherwise
 */
function isDate (literal) {
  return literal.type === 'literal+type' && literal.datatype === 'http://www.w3.org/2001/XMLSchema#dateTime'
}

function cloneLiteral (base, newValue) {
  switch (base.type) {
    case 'literal+type':
      return terms.TypedLiteralDescriptor(newValue, base.datatype)
    case 'literal+lang':
      return terms.LangLiteralDescriptor(newValue, base.lang)
    default:
      return terms.RawLiteralDescriptor(newValue)
  }
}

/**
 * Return a high-orderpply a Hash function  to a RDF
 * and returns the corresponding RDF Literal
 * @param  {string} hashType - Type of hash (md5, sha256, etc)
 * @return {function} A function that hashes RDF term
 */
function applyHash (hashType) {
  return v => {
    const hash = crypto.createHash(hashType)
    hash.update(v.value)
    return terms.RawLiteralDescriptor(hash.digest('hex'))
  }
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
const SPARQL_OPERATIONS = {
  /*
    XQuery & XPath functions https://www.w3.org/TR/sparql11-query/#OperatorMapping
  */
  '+': function (a, b) {
    if (isDate(a) || isDate(b)) {
      return terms.TypedLiteralDescriptor(a.asJS + b.asJS, XSD('dateTime'))
    }
    return terms.NumericOperation(a.asJS + b.asJS, a.datatype)
  },

  '-': function (a, b) {
    if (isDate(a) || isDate(b)) {
      return terms.TypedLiteralDescriptor(a.asJS - b.asJS, XSD('dateTime'))
    }
    return terms.NumericOperation(a.asJS - b.asJS, a.datatype)
  },

  '*': function (a, b) {
    if (isDate(a) || isDate(b)) {
      return terms.TypedLiteralDescriptor(a.asJS * b.asJS, XSD('dateTime'))
    }
    return terms.NumericOperation(a.asJS * b.asJS, a.datatype)
  },

  '/': function (a, b) {
    if (isDate(a) || isDate(b)) {
      return terms.TypedLiteralDescriptor(a.asJS / b.asJS, XSD('dateTime'))
    }
    return terms.NumericOperation(a.asJS / b.asJS, a.datatype)
  },

  '=': function (a, b) {
    if (isDate(a) && isDate(b)) {
      return terms.BooleanDescriptor(a.asJs.isSame(b.asJs))
    }
    return RDFTermEqual(a, b)
  },

  '!=': function (a, b) {
    if (isDate(a) && isDate(b)) {
      return terms.BooleanDescriptor(!(a.asJs.isSame(b.asJs)))
    }
    return terms.BooleanDescriptor(a.asJS !== b.asJS)
  },

  '<': function (a, b) {
    if (isDate(a) && isDate(b)) {
      return terms.BooleanDescriptor(a.asJs.isBefore(b.asJs))
    }
    return terms.BooleanDescriptor(a.asJS < b.asJS)
  },

  '<=': function (a, b) {
    if (isDate(a) && isDate(b)) {
      return terms.BooleanDescriptor(a.asJs.isSameOrBefore(b.asJs))
    }
    return terms.BooleanDescriptor(a.asJS <= b.asJS)
  },

  '>': function (a, b) {
    if (isDate(a) && isDate(b)) {
      return terms.BooleanDescriptor(a.asJs.isAfter(b.asJs))
    }
    return terms.BooleanDescriptor(a.asJS > b.asJS)
  },

  '>=': function (a, b) {
    if (isDate(a) && isDate(b)) {
      return terms.BooleanDescriptor(a.asJs.isSameOrAfter(b.asJs))
    }
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

  /*
    SPARQL Functional forms https://www.w3.org/TR/sparql11-query/#func-forms
  */
  'bound': function (a) {
    return terms.BooleanDescriptor(!isNull(a))
  },

  'sameterm': function (a, b) {
    return RDFTermEqual(a, b)
  },

  'in': function (a, b) {
    return terms.BooleanDescriptor(b.some(elt => a.asJS === elt.asJS))
  },

  'notin': function (a, b) {
    return terms.BooleanDescriptor(!b.some(elt => a.asJS === elt.asJS))
  },

  /*
    Functions on RDF Terms https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  */

  'isiri': function (a) {
    return terms.BooleanDescriptor(a.type === 'iri')
  },

  'isblank': function (a) {
    return terms.BooleanDescriptor(a.type === 'bnode')
  },

  'isliteral': function (a) {
    return terms.BooleanDescriptor(a.type.startsWith('literal'))
  },

  'isnumeric': function (a) {
    return terms.BooleanDescriptor(!isNaN(a.asJS))
  },

  'str': function (a) {
    return a.type.startsWith('literal') ? a : terms.RawLiteralDescriptor(a.value)
  },

  'lang': function (a) {
    if (a.type === 'literal+lang') {
      return terms.RawLiteralDescriptor(a.lang.toLowerCase())
    }
    return terms.RawLiteralDescriptor('')
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
  },

  'iri': function (a) {
    return terms.IRIDescriptor(a.value)
  },

  'strdt': function (x, datatype) {
    return terms.TypedLiteralDescriptor(x.value, datatype.value)
  },

  'strlang': function (x, lang) {
    return terms.LangLiteralDescriptor(x.value, lang.value)
  },

  'uuid': function () {
    return terms.IRIDescriptor(`urn:uuid:${uuid()}`)
  },

  'struuid': function () {
    return terms.RawLiteralDescriptor(uuid)
  },

  /*
    Functions on Strings https://www.w3.org/TR/sparql11-query/#func-strings
  */

  'strlen': function (a) {
    return terms.NumericOperation(a.value.length, XSD('integer'))
  },

  'substr': function (str, index, length = null) {
    if (index.asJS < 1) {
      throw new Error('SUBSTR error: the index of the first character in a string is 1 (according to the SPARQL W3C specs)')
    }
    let value = str.value.substring(index.asJS - 1)
    if (length !== null) {
      value = value.substring(0, length.asJS)
    }
    return cloneLiteral(str, value)
  },

  'ucase': function (a) {
    return cloneLiteral(a, a.value.toUpperCase())
  },

  'lcase': function (a) {
    return cloneLiteral(a, a.value.toLowerCase())
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

  'contains': function (string, substring) {
    const a = string.value
    const b = substring.value
    return terms.BooleanDescriptor(a.indexOf(b) >= 0)
  },

  'strbefore': function (str, token) {
    const index = str.value.indexOf(token.value)
    const value = (index > -1) ? str.value.substring(0, index) : ''
    return cloneLiteral(str, value)
  },

  'strafter': function (str, token) {
    const index = str.value.indexOf(token.value)
    const value = (index > -1) ? str.value.substring(index + token.value.length) : ''
    return cloneLiteral(str, value)
  },

  'encode_for_uri': function (a) {
    return terms.RawLiteralDescriptor(encodeURIComponent(a.value))
  },

  'concat': function (a, b) {
    if (a.type !== b.type) {
      return terms.RawLiteralDescriptor(a.value + b.value)
    }
    return cloneLiteral(a, a.value + b.value)
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

  'regex': function (subject, pattern, flags = null) {
    let regexp = (flags === null) ? new RegExp(pattern.value) : new RegExp(pattern.value, flags.value)
    return terms.BooleanDescriptor(regexp.test(subject.value))
  },

  /*
    Functions on Numerics https://www.w3.org/TR/sparql11-query/#func-numerics
  */

  'abs': function (a) {
    return terms.NumericOperation(Math.abs(a.asJS), XSD('integer'))
  },

  'round': function (a) {
    return terms.NumericOperation(Math.round(a.asJS), XSD('integer'))
  },

  'ceil': function (a) {
    return terms.NumericOperation(Math.ceil(a.asJS), XSD('integer'))
  },

  'floor': function (a) {
    return terms.NumericOperation(Math.floor(a.asJS), XSD('integer'))
  },

  /*
    Functions on Dates and Times https://www.w3.org/TR/sparql11-query/#func-date-time
  */

  'now': function () {
    return terms.DateLiteral(moment())
  },

  'year': function (a) {
    return terms.NumericOperation(a.asJS.year(), XSD('integer'))
  },

  'month': function (a) {
    return terms.NumericOperation(a.asJS.month() + 1, XSD('integer'))
  },

  'day': function (a) {
    return terms.NumericOperation(a.asJS.date(), XSD('integer'))
  },

  'hours': function (a) {
    return terms.NumericOperation(a.asJS.hours(), XSD('integer'))
  },

  'minutes': function (a) {
    return terms.NumericOperation(a.asJS.minutes(), XSD('integer'))
  },

  'seconds': function (a) {
    return terms.NumericOperation(a.asJS.seconds(), XSD('integer'))
  },

  'tz': function (a) {
    const offset = a.asJS.utcOffset() / 60
    return terms.RawLiteralDescriptor(offset.toString())
  },

  /*
    Hash Functions https://www.w3.org/TR/sparql11-query/#func-hash
  */

  'md5': applyHash('md5'),
  'sha1': applyHash('sha1'),
  'sha256': applyHash('sha256'),
  'sha384': applyHash('sha384'),
  'sha512': applyHash('sha512')
}

module.exports = SPARQL_OPERATIONS