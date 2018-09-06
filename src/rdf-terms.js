/* file : rdf-terms.js
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

const moment = require('moment')

/**
 * Parse a RDF Term to its Javascript representation
 * @param  {string} term - RDF Term to parse
 * @return {String|Number|Date} Javascript representationof the term
 */
function termToJS (value, type) {
  switch (type) {
    case 'http://www.w3.org/2001/XMLSchema#integer':
    case 'http://www.w3.org/2001/XMLSchema#number':
    case 'http://www.w3.org/2001/XMLSchema#float':
    case 'http://www.w3.org/2001/XMLSchema#decimal':
    case 'http://www.w3.org/2001/XMLSchema#double':
      return Number(value)
    case 'http://www.w3.org/2001/XMLSchema#boolean':
      return value === '"true"'
    case 'http://www.w3.org/2001/XMLSchema#dateTime':
      return moment.parseZone(value)
    default:
      throw new Error(`Unknown Datatype found during RDF Term parsing: ${value} (datatype: ${type})`)
  }
}

function IRIDescriptor (iri) {
  return {
    type: 'iri',
    value: iri,
    asRDF: iri,
    asJS: iri
  }
}

function RawLiteralDescriptor (literal) {
  const rdf = `"${literal}"`
  return {
    type: 'literal',
    value: literal,
    asRDF: rdf,
    asJS: rdf
  }
}

function TypedLiteralDescriptor (literal, type) {
  return {
    type: 'literal+type',
    value: literal,
    datatype: type,
    asRDF: `"${literal}"^^${type}`,
    asJS: termToJS(literal, type)
  }
}

function LangLiteralDescriptor (literal, lang) {
  const rdf = `"${literal}"@${lang}`
  return {
    type: 'literal+lang',
    value: literal,
    lang,
    asRDF: rdf,
    asJS: rdf
  }
}

function BooleanDescriptor (value) {
  return {
    type: 'literal+type',
    value: `"${value}"`,
    datatype: 'http://www.w3.org/2001/XMLSchema#boolean',
    asRDF: `"${value}"^^http://www.w3.org/2001/XMLSchema#boolean`,
    asJS: value
  }
}

function NumericOperation (value, type) {
  return {
    type: 'literal+type',
    value: value.toString(),
    datatype: type,
    asRDF: `"${value}"^^${type}`,
    asJS: value
  }
}

function DateLiteral (date) {
  const value = date.toISOString()
  return {
    type: 'literal+type',
    value: value,
    datatype: 'http://www.w3.org/2001/XMLSchema#dateTime',
    asRDF: `"${value}"^^http://www.w3.org/2001/XMLSchema#dateTime`,
    asJS: date
  }
}

module.exports = {
  IRIDescriptor,
  RawLiteralDescriptor,
  TypedLiteralDescriptor,
  LangLiteralDescriptor,
  BooleanDescriptor,
  NumericOperation,
  DateLiteral
}
