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

'use strict'

import { rdf } from '../../utils'
import { terms } from '../../rdf-terms'
import * as moment from 'moment'
import * as uuid from 'uuid/v4'
import { isNull } from 'lodash'
import * as crypto from 'crypto'

/**
 * Return a high-orderpply a Hash function  to a RDF
 * and returns the corresponding RDF Literal
 * @param  {string} hashType - Type of hash (md5, sha256, etc)
 * @return {function} A function that hashes RDF term
 */
function applyHash (hashType: string): (v: terms.RDFTerm) => terms.RDFTerm {
  return v => {
    const hash = crypto.createHash(hashType)
    hash.update(v.value)
    return terms.createLiteral(hash.digest('hex'))
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
export default {
  /*
    XQuery & XPath functions https://www.w3.org/TR/sparql11-query/#OperatorMapping
  */
  '+': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) || terms.isDate(b)) {
      return terms.createDate(a.asJS + b.asJS)
    } else if (a.type === 'literal+type' && b.type === 'literal+type') {
      return terms.createNumber(a.asJS + b.asJS, (<terms.TypedLiteral> a).datatype)
    }
    return terms.createLiteral(a.asJS + b.asJS)
  },

  '-': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) || terms.isDate(b)) {
      return terms.createDate(moment(a.asJS - b.asJS))
    } else if (a.type === 'literal+type' && b.type === 'literal+type') {
      return terms.createNumber(a.asJS - b.asJS, (<terms.TypedLiteral> a).datatype)
    }
    return terms.createLiteral('')
  },

  '*': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) || terms.isDate(b)) {
      return terms.createDate(moment(a.asJS * b.asJS))
    } else if (a.type === 'literal+type' && b.type === 'literal+type') {
      return terms.createNumber(a.asJS * b.asJS, (<terms.TypedLiteral> a).datatype)
    }
    return terms.createLiteral('')
  },

  '/': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) || terms.isDate(b)) {
      return terms.createDate(moment(a.asJS / b.asJS))
    } else if (a.type === 'literal+type' && b.type === 'literal+type') {
      return terms.createNumber(a.asJS / b.asJS, (<terms.TypedLiteral> a).datatype)
    }
    return terms.createLiteral('')
  },

  '=': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) && terms.isDate(b)) {
      return terms.createBoolean(a.asJS.isSame(b.asJS))
    }
    return terms.equals(a, b)
  },

  '!=': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) && terms.isDate(b)) {
      return terms.createBoolean(!(a.asJS.isSame(b.asJS)))
    }
    return terms.createBoolean(a.asJS !== b.asJS)
  },

  '<': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) && terms.isDate(b)) {
      return terms.createBoolean(a.asJS.isBefore(b.asJS))
    }
    return terms.createBoolean(a.asJS < b.asJS)
  },

  '<=': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) && terms.isDate(b)) {
      return terms.createBoolean(a.asJS.isSameOrBefore(b.asJS))
    }
    return terms.createBoolean(a.asJS <= b.asJS)
  },

  '>': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) && terms.isDate(b)) {
      return terms.createBoolean(a.asJS.isAfter(b.asJS))
    }
    return terms.createBoolean(a.asJS > b.asJS)
  },

  '>=': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (terms.isDate(a) && terms.isDate(b)) {
      return terms.createBoolean(a.asJS.isSameOrAfter(b.asJS))
    }
    return terms.createBoolean(a.asJS >= b.asJS)
  },

  '!': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createBoolean(!a.asJS)
  },

  '&&': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    return terms.createBoolean(a.asJS && b.asJS)
  },

  '||': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    return terms.createBoolean(a.asJS || b.asJS)
  },

  /*
    SPARQL Functional forms https://www.w3.org/TR/sparql11-query/#func-forms
  */
  'bound': function (a: terms.RDFTerm) {
    return terms.createBoolean(!isNull(a))
  },

  'sameterm': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    return terms.equals(a, b)
  },

  'in': function (a: terms.RDFTerm, b: terms.RDFTerm[]): terms.RDFTerm {
    return terms.createBoolean(b.some(elt => a.asJS === elt.asJS))
  },

  'notin': function (a: terms.RDFTerm, b: terms.RDFTerm[]): terms.RDFTerm {
    return terms.createBoolean(!b.some(elt => a.asJS === elt.asJS))
  },

  /*
    Functions on RDF Terms https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  */

  'isiri': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createBoolean(a.type === 'iri')
  },

  'isblank': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createBoolean(a.type === 'bnode')
  },

  'isliteral': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createBoolean(a.type.startsWith('literal'))
  },

  'isnumeric': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createBoolean(!isNaN(a.asJS))
  },

  'str': function (a: terms.RDFTerm): terms.RDFTerm {
    return a.type.startsWith('literal') ? a : terms.createLiteral(a.value)
  },

  'lang': function (a: terms.RDFTerm): terms.RDFTerm {
    if (a.type === 'literal+lang') {
      return terms.createLiteral((<terms.LangLiteral> a).lang.toLowerCase())
    }
    return terms.createLiteral('')
  },

  'datatype': function (a: terms.RDFTerm): terms.RDFTerm {
    switch (a.type) {
      case 'literal':
        return terms.createIRI(rdf.XSD('string'))
      case 'literal+type':
        return terms.createIRI((<terms.TypedLiteral> a).datatype)
      case 'literal+lang':
        return terms.createIRI(rdf.RDF('langString'))
      default:
        return terms.createLiteral('')
    }
  },

  'iri': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createIRI(a.value)
  },

  'strdt': function (x: terms.RDFTerm, datatype: terms.RDFTerm): terms.RDFTerm {
    return terms.createTypedLiteral(x.value, datatype.value)
  },

  'strlang': function (x: terms.RDFTerm, lang: terms.RDFTerm): terms.RDFTerm {
    return terms.createLangLiteral(x.value, lang.value)
  },

  'uuid': function (): terms.RDFTerm {
    return terms.createIRI(`urn:uuid:${uuid()}`)
  },

  'struuid': function (): terms.RDFTerm {
    return terms.createLiteral(uuid())
  },

  /*
    Functions on Strings https://www.w3.org/TR/sparql11-query/#func-strings
  */

  'strlen': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(a.value.length, rdf.XSD('integer'))
  },

  'substr': function (str: terms.RDFTerm, index: terms.RDFTerm, length?: terms.RDFTerm): terms.RDFTerm {
    if (index.asJS < 1) {
      throw new Error('SUBSTR error: the index of the first character in a string is 1 (according to the SPARQL W3C specs)')
    }
    let value = str.value.substring(index.asJS - 1)
    if (length !== null && length !== undefined) {
      value = value.substring(0, length.asJS)
    }
    return terms.replaceLiteralValue(str, value)
  },

  'ucase': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.replaceLiteralValue(a, a.value.toUpperCase())
  },

  'lcase': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.replaceLiteralValue(a, a.value.toLowerCase())
  },

  'strstarts': function (string: terms.RDFTerm, substring: terms.RDFTerm): terms.RDFTerm {
    const a = string.value
    const b = substring.value
    return terms.createBoolean(a.startsWith(b))
  },

  'strends': function (string: terms.RDFTerm, substring: terms.RDFTerm): terms.RDFTerm {
    const a = string.value
    const b = substring.value
    return terms.createBoolean(a.endsWith(b))
  },

  'contains': function (string: terms.RDFTerm, substring: terms.RDFTerm): terms.RDFTerm {
    const a = string.value
    const b = substring.value
    return terms.createBoolean(a.indexOf(b) >= 0)
  },

  'strbefore': function (str: terms.RDFTerm, token: terms.RDFTerm): terms.RDFTerm {
    const index = str.value.indexOf(token.value)
    const value = (index > -1) ? str.value.substring(0, index) : ''
    return terms.replaceLiteralValue(str, value)
  },

  'strafter': function (str: terms.RDFTerm, token: terms.RDFTerm): terms.RDFTerm {
    const index = str.value.indexOf(token.value)
    const value = (index > -1) ? str.value.substring(index + token.value.length) : ''
    return terms.replaceLiteralValue(str, value)
  },

  'encode_for_uri': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createLiteral(encodeURIComponent(a.value))
  },

  'concat': function (a: terms.RDFTerm, b: terms.RDFTerm): terms.RDFTerm {
    if (a.type !== b.type) {
      return terms.createLiteral(a.value + b.value)
    }
    return terms.replaceLiteralValue(a, a.value + b.value)
  },

  'langmatches': function (langTag: terms.RDFTerm, langRange: terms.RDFTerm): terms.RDFTerm {
    // Implements https://tools.ietf.org/html/rfc4647#section-3.3.1
    const tag = langTag.value.toLowerCase()
    const range = langRange.value.toLowerCase()
    const test = tag === range ||
                  range === '*' ||
                  tag.substr(1, range.length + 1) === range + '-'
    return terms.createBoolean(test)
  },

  'regex': function (subject: terms.RDFTerm, pattern: terms.RDFTerm, flags: terms.RDFTerm) {
    let regexp = (flags === null || flags === undefined) ? new RegExp(pattern.value) : new RegExp(pattern.value, flags.value)
    return terms.createBoolean(regexp.test(subject.value))
  },

  /*
    Functions on Numerics https://www.w3.org/TR/sparql11-query/#func-numerics
  */

  'abs': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(Math.abs(a.asJS), rdf.XSD('integer'))
  },

  'round': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(Math.round(a.asJS), rdf.XSD('integer'))
  },

  'ceil': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(Math.ceil(a.asJS), rdf.XSD('integer'))
  },

  'floor': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(Math.floor(a.asJS), rdf.XSD('integer'))
  },

  /*
    Functions on Dates and Times https://www.w3.org/TR/sparql11-query/#func-date-time
  */

  'now': function (): terms.RDFTerm {
    return terms.createDate(moment())
  },

  'year': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(a.asJS.year(), rdf.XSD('integer'))
  },

  'month': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(a.asJS.month() + 1, rdf.XSD('integer'))
  },

  'day': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(a.asJS.date(), rdf.XSD('integer'))
  },

  'hours': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(a.asJS.hours(), rdf.XSD('integer'))
  },

  'minutes': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(a.asJS.minutes(), rdf.XSD('integer'))
  },

  'seconds': function (a: terms.RDFTerm): terms.RDFTerm {
    return terms.createNumber(a.asJS.seconds(), rdf.XSD('integer'))
  },

  'tz': function (a: terms.RDFTerm): terms.RDFTerm {
    const offset = a.asJS.utcOffset() / 60
    return terms.createLiteral(offset.toString())
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
