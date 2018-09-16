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

'use strict'

import moment from 'moment'
// const moment = require('moment')

export interface RDFTerm {
  readonly type: string,
  readonly value: string,
  readonly asRDF: string,
  readonly asJS: any
}

export interface IRI extends RDFTerm {}

export interface RawLiteral extends RDFTerm {}

export interface LangLiteral extends RDFTerm {
  readonly lang: string
}

export interface TypedLiteral extends RDFTerm {
  readonly datatype: string
}

/**
 * Parse a RDF Term to its Javascript representation
 * @param  {string} term - RDF Term to parse
 * @return {String|Number|Date} Javascript representationof the term
 */
function termToJS (value: string, type: string): any {
  switch (type) {
    case 'http://www.w3.org/2001/XMLSchema#string':
      return value
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

export function IRIDescriptor (iri: string): IRI {
  return {
    type: 'iri',
    value: iri,
    asRDF: iri,
    asJS: iri
  }
}

export function RawLiteralDescriptor (literal: string): RawLiteral {
  const rdf = `"${literal}"`
  return {
    type: 'literal',
    value: literal,
    asRDF: rdf,
    asJS: rdf
  }
}

export function TypedLiteralDescriptor (literal: string, type: string): TypedLiteral {
  return {
    type: 'literal+type',
    value: literal,
    datatype: type,
    asRDF: `"${literal}"^^${type}`,
    asJS: termToJS(literal, type)
  }
}

export function LangLiteralDescriptor (literal: string, lang: string): LangLiteral {
  const rdf = `"${literal}"@${lang}`
  return {
    type: 'literal+lang',
    value: literal,
    lang,
    asRDF: rdf,
    asJS: rdf
  }
}

export function BooleanDescriptor (value: boolean): TypedLiteral {
  return {
    type: 'literal+type',
    value: `"${value}"`,
    datatype: 'http://www.w3.org/2001/XMLSchema#boolean',
    asRDF: `"${value}"^^http://www.w3.org/2001/XMLSchema#boolean`,
    asJS: value
  }
}

export function NumericOperation (value: number, type: string): TypedLiteral {
  return {
    type: 'literal+type',
    value: value.toString(),
    datatype: type,
    asRDF: `"${value}"^^${type}`,
    asJS: value
  }
}

export function DateLiteral (date: moment.Moment): TypedLiteral {
  const value = date.toISOString()
  return {
    type: 'literal+type',
    value: value,
    datatype: 'http://www.w3.org/2001/XMLSchema#dateTime',
    asRDF: `"${value}"^^http://www.w3.org/2001/XMLSchema#dateTime`,
    asJS: date
  }
}
