/* file : sparql-operations.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

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

import crypto from 'crypto'
import { isNull } from 'lodash'
import moment from 'moment'
import { v4 as uuid } from 'uuid'
import { rdf } from '../../utils.js'

/**
 * Return a high-orderpply a Hash function  to a RDF
 * and returns the corresponding RDF Literal
 * @param  {string} hashType - Type of hash (md5, sha256, etc)
 * @return {function} A function that hashes RDF term
 */
function applyHash(hashType: string): (v: rdf.Term) => rdf.Term {
  return v => {
    const hash = crypto.createHash(hashType)
    hash.update(v.value)
    return rdf.createLiteral(hash.digest('hex'))
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
    COALESCE function https://www.w3.org/TR/sparql11-query/#func-coalesce
  */
  'coalesce': function (baseValue: rdf.Term | null, defaultValue: rdf.Term | null): rdf.Term {
    if (!isNull(baseValue)) {
      return baseValue
    } else if (!isNull(defaultValue)) {
      return defaultValue
    }
    return rdf.createUnbound()
  },

  /*
    IF function https://www.w3.org/TR/sparql11-query/#func-if
  */
  'if': function (booleanValue: rdf.Term | null, valueIfTrue: rdf.Term | null, valueIfFalse: rdf.Term | null): rdf.Term {
    if (isNull(booleanValue) || isNull(valueIfTrue) || isNull(valueIfFalse)) {
      throw new SyntaxError(`SPARQL expression error: some arguments of an IF function are unbound. Got IF(${booleanValue}, ${valueIfTrue}, ${valueIfFalse})`)
    }
    if (rdf.isLiteral(booleanValue) && (rdf.literalIsBoolean(booleanValue) || rdf.literalIsNumeric(booleanValue))) {
      return rdf.asJS(booleanValue.value, booleanValue.datatype.value) ? valueIfTrue : valueIfFalse
    }
    throw new SyntaxError(`SPARQL expression error: you are using an IF function whose first argument is expected to be a boolean, but instead got ${booleanValue}`)
  },

  /*
    XQuery & XPath functions https://www.w3.org/TR/sparql11-query/#OperatorMapping
  */
  '+': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      const valueA = rdf.asJS(a.value, a.datatype.value)
      const valueB = rdf.asJS(b.value, b.datatype.value)
      if (rdf.literalIsDate(a) && rdf.literalIsDate(b)) {
        return rdf.createDate(moment(valueA + valueB))
      }
      return rdf.createTypedLiteral(valueA + valueB, a.datatype)
    }
    return rdf.createLiteral(rdf.asJS(a.value, null) + rdf.asJS(b.value, null))
  },

  '-': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      const valueA = rdf.asJS(a.value, a.datatype.value)
      const valueB = rdf.asJS(b.value, b.datatype.value)
      if (rdf.literalIsDate(a) && rdf.literalIsDate(b)) {
        return rdf.createDate(moment(valueA - valueB))
      }
      return rdf.createTypedLiteral(valueA - valueB, a.datatype)
    }
    throw new SyntaxError(`SPARQL expression error: cannot substract non-Literals ${a} and ${b}`)
  },

  '*': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      const valueA = rdf.asJS(a.value, a.datatype.value)
      const valueB = rdf.asJS(b.value, b.datatype.value)
      if (rdf.literalIsDate(a) && rdf.literalIsDate(b)) {
        return rdf.createDate(moment(valueA * valueB))
      }
      return rdf.createTypedLiteral(valueA * valueB, a.datatype)
    }
    throw new SyntaxError(`SPARQL expression error: cannot multiply non-Literals ${a} and ${b}`)
  },

  '/': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      const valueA = rdf.asJS(a.value, a.datatype.value)
      const valueB = rdf.asJS(b.value, b.datatype.value)
      if (rdf.literalIsDate(a) && rdf.literalIsDate(b)) {
        return rdf.createDate(moment(valueA / valueB))
      }
      return rdf.createTypedLiteral(valueA / valueB, a.datatype)
    }
    throw new SyntaxError(`SPARQL expression error: cannot divide non-Literals ${a} and ${b}`)
  },

  '=': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    return rdf.createBoolean(rdf.termEquals(a, b))
  },

  '!=': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    return rdf.createBoolean(!rdf.termEquals(a, b))
  },

  '<': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      const valueA = rdf.asJS(a.value, a.datatype.value)
      const valueB = rdf.asJS(b.value, b.datatype.value)
      if (rdf.literalIsDate(a) && rdf.literalIsDate(b)) {
        // use Moment.js isBefore function to compare two dates
        return rdf.createBoolean(valueA.isBefore(valueB))
      }
      return rdf.createBoolean(valueA < valueB)
    }
    return rdf.createBoolean(a.value < b.value)
  },

  '<=': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      const valueA = rdf.asJS(a.value, a.datatype.value)
      const valueB = rdf.asJS(b.value, b.datatype.value)
      if (rdf.literalIsDate(a) && rdf.literalIsDate(b)) {
        // use Moment.js isSameOrBefore function to compare two dates
        return rdf.createBoolean(valueA.isSameOrBefore(valueB))
      }
      return rdf.createBoolean(valueA <= valueB)
    }
    return rdf.createBoolean(a.value <= b.value)
  },

  '>': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      const valueA = rdf.asJS(a.value, a.datatype.value)
      const valueB = rdf.asJS(b.value, b.datatype.value)
      if (rdf.literalIsDate(a) && rdf.literalIsDate(b)) {
        // use Moment.js isAfter function to compare two dates
        return rdf.createBoolean(valueA.isAfter(valueB))
      }
      return rdf.createBoolean(valueA > valueB)
    }
    return rdf.createBoolean(a.value > b.value)
  },

  '>=': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      const valueA = rdf.asJS(a.value, a.datatype.value)
      const valueB = rdf.asJS(b.value, b.datatype.value)
      if (rdf.literalIsDate(a) && rdf.literalIsDate(b)) {
        // use Moment.js isSameOrAfter function to compare two dates
        return rdf.createBoolean(valueA.isSameOrAfter(valueB))
      }
      return rdf.createBoolean(valueA >= valueB)
    }
    return rdf.createBoolean(a.value >= b.value)
  },

  '!': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsBoolean(a)) {
      return rdf.createBoolean(!rdf.asJS(a.value, a.datatype.value))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the negation of a non boolean literal ${a}`)
  },

  '&&': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b) && rdf.literalIsBoolean(a) && rdf.literalIsBoolean(b)) {
      return rdf.createBoolean(rdf.asJS(a.value, a.datatype.value) && rdf.asJS(b.value, b.datatype.value))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the conjunction of non boolean literals ${a} and ${b}`)
  },

  '||': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b) && rdf.literalIsBoolean(a) && rdf.literalIsBoolean(b)) {
      return rdf.createBoolean(rdf.asJS(a.value, a.datatype.value) || rdf.asJS(b.value, b.datatype.value))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the disjunction of non boolean literals ${a} and ${b}`)
  },

  /*
    SPARQL Functional forms https://www.w3.org/TR/sparql11-query/#func-forms
  */
  'bound': function (a: rdf.Term) {
    return rdf.createBoolean(!isNull(a))
  },

  'sameterm': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    return rdf.createBoolean(a.value === b.value)
  },

  'in': function (a: rdf.Term, b: rdf.Term[]): rdf.Term {
    return rdf.createBoolean(b.some(elt => rdf.termEquals(a, elt)))
  },

  'notin': function (a: rdf.Term, b: rdf.Term[]): rdf.Term {
    return rdf.createBoolean(!b.some(elt => rdf.termEquals(a, elt)))
  },

  /*
    Functions on RDF Terms https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  */

  'isiri': function (a: rdf.Term): rdf.Term {
    return rdf.createBoolean(rdf.isNamedNode(a))
  },

  'isblank': function (a: rdf.Term): rdf.Term {
    return rdf.createBoolean(rdf.isBlankNode(a))
  },

  'isliteral': function (a: rdf.Term): rdf.Term {
    return rdf.createBoolean(rdf.isLiteral(a))
  },

  'isnumeric': function (a: rdf.Term): rdf.Term {
    return rdf.createBoolean(rdf.isLiteral(a) && rdf.literalIsNumeric(a))
  },

  'str': function (a: rdf.Term): rdf.Term {
    return rdf.createLiteral(rdf.toN3(a))
  },

  'lang': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a)) {
      return rdf.createLiteral(a.language.toLowerCase())
    }
    return rdf.createLiteral('')
  },

  'datatype': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a)) {
      return rdf.createLiteral(a.datatype.value)
    }
    return rdf.createLiteral('')
  },

  'iri': function (a: rdf.Term): rdf.Term {
    return rdf.createIRI(a.value)
  },

  'bnode': function (a?: rdf.Term): rdf.Term {
    if (a === undefined) {
      return rdf.createBNode()
    }
    return rdf.createBNode(a.value)
  },

  'strdt': function (x: rdf.Term, datatype: rdf.NamedNode): rdf.Term {
    return rdf.createTypedLiteral(x.value, datatype)
  },

  'strlang': function (x: rdf.Term, lang: rdf.Term): rdf.Term {
    return rdf.createLangLiteral(x.value, lang.value)
  },

  'uuid': function (): rdf.Term {
    return rdf.createIRI(`urn:uuid:${uuid()}`)
  },

  'struuid': function (): rdf.Term {
    return rdf.createLiteral(uuid())
  },

  /*
    Functions on Strings https://www.w3.org/TR/sparql11-query/#func-strings
  */

  'strlen': function (a: rdf.Term): rdf.Term {
    return rdf.createInteger(a.value.length)
  },

  'substr': function (str: rdf.Term, index: rdf.Term, length?: rdf.Term): rdf.Term {
    const indexValue = rdf.asJS(index.value, rdf.XSD.integer.value)
    if (indexValue < 1) {
      throw new SyntaxError('SPARQL SUBSTR error: the index of the first character in a string is 1 (according to the SPARQL W3C specs)')
    }
    let value = str.value.substring(indexValue - 1)
    if (length !== undefined) {
      const lengthValue = rdf.asJS(length.value, rdf.XSD.integer.value)
      value = value.substring(0, lengthValue)
    }
    return rdf.shallowCloneTerm(str, value)
  },

  'ucase': function (a: rdf.Term): rdf.Term {
    return rdf.shallowCloneTerm(a, a.value.toUpperCase())
  },

  'lcase': function (a: rdf.Term): rdf.Term {
    return rdf.shallowCloneTerm(a, a.value.toLowerCase())
  },

  'strstarts': function (term: rdf.Term, substring: rdf.Term): rdf.Term {
    const a = term.value
    const b = substring.value
    return rdf.createBoolean(a.startsWith(b))
  },

  'strends': function (term: rdf.Term, substring: rdf.Term): rdf.Term {
    const a = term.value
    const b = substring.value
    return rdf.createBoolean(a.endsWith(b))
  },

  'contains': function (term: rdf.Term, substring: rdf.Term): rdf.Term {
    const a = term.value
    const b = substring.value
    return rdf.createBoolean(a.indexOf(b) >= 0)
  },

  'strbefore': function (term: rdf.Term, token: rdf.Term): rdf.Term {
    const index = term.value.indexOf(token.value)
    const value = (index > -1) ? term.value.substring(0, index) : ''
    return rdf.shallowCloneTerm(term, value)
  },

  'strafter': function (str: rdf.Term, token: rdf.Term): rdf.Term {
    const index = str.value.indexOf(token.value)
    const value = (index > -1) ? str.value.substring(index + token.value.length) : ''
    return rdf.shallowCloneTerm(str, value)
  },

  'encode_for_uri': function (a: rdf.Term): rdf.Term {
    return rdf.createLiteral(encodeURIComponent(a.value))
  },

  'concat': function (a: rdf.Term, b: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.isLiteral(b)) {
      return rdf.shallowCloneTerm(a, a.value + b.value)
    }
    return rdf.createLiteral(a.value + b.value)
  },

  'langmatches': function (langTag: rdf.Term, langRange: rdf.Term): rdf.Term {
    // Implements https://tools.ietf.org/html/rfc4647#section-3.3.1
    const tag = langTag.value.toLowerCase()
    const range = langRange.value.toLowerCase()
    const test = tag === range ||
      range === '*' ||
      tag.substr(1, range.length + 1) === range + '-'
    return rdf.createBoolean(test)
  },

  'regex': function (subject: rdf.Term, pattern: rdf.Term, flags?: rdf.Term) {
    const regexp = (flags === undefined) ? new RegExp(pattern.value) : new RegExp(pattern.value, flags.value)
    return rdf.createBoolean(regexp.test(subject.value))
  },

  'replace': function (arg: rdf.Term, pattern: rdf.Term, replacement: rdf.Term, flags?: rdf.Term) {
    const regexp = (flags === undefined) ? new RegExp(pattern.value) : new RegExp(pattern.value, flags.value)
    const newValue = arg.value.replace(regexp, replacement.value)
    if (rdf.isNamedNode(arg)) {
      return rdf.createIRI(newValue)
    } else if (rdf.isBlankNode(arg)) {
      return rdf.createBNode(newValue)
    }
    return rdf.shallowCloneTerm(arg, newValue)
  },

  /*
    Functions on Numerics https://www.w3.org/TR/sparql11-query/#func-numerics
  */

  'abs': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsNumeric(a)) {
      return rdf.createInteger(Math.abs(rdf.asJS(a.value, a.datatype.value)))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the absolute value of the non-numeric term ${a}`)
  },

  'round': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsNumeric(a)) {
      return rdf.createInteger(Math.round(rdf.asJS(a.value, a.datatype.value)))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the rounded value of the non-numeric term ${a}`)
  },

  'ceil': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsNumeric(a)) {
      return rdf.createInteger(Math.ceil(rdf.asJS(a.value, a.datatype.value)))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute Math.ceil on the non-numeric term ${a}`)
  },

  'floor': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsNumeric(a)) {
      return rdf.createInteger(Math.floor(rdf.asJS(a.value, a.datatype.value)))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute Math.floor on the non-numeric term ${a}`)
  },

  /*
    Functions on Dates and Times https://www.w3.org/TR/sparql11-query/#func-date-time
  */

  'now': function (): rdf.Term {
    return rdf.createDate(moment())
  },

  'year': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsDate(a)) {
      const value = rdf.asJS(a.value, a.datatype.value)
      return rdf.createInteger(value.year())
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the year of the RDF Term ${a}, as it is not a date`)
  },

  'month': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsDate(a)) {
      const value = rdf.asJS(a.value, a.datatype.value)
      // Warning: Months are zero indexed in Moment.js, so January is month 0.
      return rdf.createInteger(value.month() + 1)
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the month of the RDF Term ${a}, as it is not a date`)
  },

  'day': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsDate(a)) {
      const value = rdf.asJS(a.value, a.datatype.value)
      return rdf.createInteger(value.date())
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the day of the RDF Term ${a}, as it is not a date`)
  },

  'hours': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsDate(a)) {
      const value = rdf.asJS(a.value, a.datatype.value)
      return rdf.createInteger(value.hours())
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the hours of the RDF Term ${a}, as it is not a date`)
  },

  'minutes': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsDate(a)) {
      const value = rdf.asJS(a.value, a.datatype.value)
      return rdf.createInteger(value.minutes())
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the minutes of the RDF Term ${a}, as it is not a date`)
  },

  'seconds': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsDate(a)) {
      const value = rdf.asJS(a.value, a.datatype.value)
      return rdf.createInteger(value.seconds())
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the seconds of the RDF Term ${a}, as it is not a date`)
  },

  'tz': function (a: rdf.Term): rdf.Term {
    if (rdf.isLiteral(a) && rdf.literalIsDate(a)) {
      const value = rdf.asJS(a.value, a.datatype.value).utcOffset() / 60
      return rdf.createLiteral(value.toString())
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the timezone of the RDF Term ${a}, as it is not a date`)
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
