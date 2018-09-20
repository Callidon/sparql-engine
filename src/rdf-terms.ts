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

import { parseZone, Moment } from 'moment'

/**
 * An intermediate format to represent RDF Terms
 */
export interface RDFTerm {
  /**
   * Type of the term
   */
  readonly type: string,
  /**
   * Value of the term, in string format
   */
  readonly value: string,
  /**
   * RDF representation of the term
   */
  readonly asRDF: string,
  /**
   * JS representation of the term
   */
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
 * Parse a RDF Literal to its Javascript representation
 * @param  {string} value - Literal value
 * @param  {string} type - Literal datatype
 * @return {String|Number|Date} Javascript representation of the literal
 */
function literalToJS (value: string, type: string): any {
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
      return parseZone(value)
    default:
      throw new Error(`Unknown Datatype found during RDF Term parsing: ${value} (datatype: ${type})`)
  }
}

/**
 * Creates an IRI in {@link RDFTerm} format
 * @param {string} iri - IRI
 * @return {IRI} A new IRI in {@link RDFTerm} format
 */
export function IRIDescriptor (iri: string): IRI {
  return {
    type: 'iri',
    value: iri,
    asRDF: iri,
    asJS: iri
  }
}

/**
 * Creates a Literal in {@link RDFTerm} format
 * @param {string} literal - Literal
 * @return {RawLiteral} A new Literal in {@link RDFTerm} format
 */
export function RawLiteralDescriptor (literal: string): RawLiteral {
  const rdf = `"${literal}"`
  return {
    type: 'literal',
    value: literal,
    asRDF: rdf,
    asJS: rdf
  }
}

/**
 * Creates a Literal with a datatype, in {@link RDFTerm} format
 * @param {string} literal - Literal
 * @param {string} type - Literal datatype
 * @return {TypedLiteral} A new typed Literal in {@link RDFTerm} format
 */
export function TypedLiteralDescriptor (literal: string, type: string): TypedLiteral {
  return {
    type: 'literal+type',
    value: literal,
    datatype: type,
    asRDF: `"${literal}"^^${type}`,
    asJS: literalToJS(literal, type)
  }
}

/**
 * Creates a Literal with a language tag, in {@link RDFTerm} format
 * @param {string} literal - Literal
 * @param {string} lang - Language tag
 * @return {LangLiteral} A new tagged Literal in {@link RDFTerm} format
 */
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

/**
 * Creates a Literal from a boolean, in {@link RDFTerm} format
 * @param {boolean} value - Boolean
 * @return {TypedLiteral} A new typed Literal in {@link RDFTerm} format
 */
export function BooleanDescriptor (value: boolean): TypedLiteral {
  return {
    type: 'literal+type',
    value: `"${value}"`,
    datatype: 'http://www.w3.org/2001/XMLSchema#boolean',
    asRDF: `"${value}"^^http://www.w3.org/2001/XMLSchema#boolean`,
    asJS: value
  }
}

/**
 * Creates a Literal from a number, in {@link RDFTerm} format
 * @param {number} value - Number
 * @param {string} type - Literal type
 * @return {TypedLiteral} A new typed Literal in {@link RDFTerm} format
 */
export function NumericOperation (value: number, type: string): TypedLiteral {
  return {
    type: 'literal+type',
    value: value.toString(),
    datatype: type,
    asRDF: `"${value}"^^${type}`,
    asJS: value
  }
}

/**
 * Creates a Literal from a Moment date, in {@link RDFTerm} format
 * @param {Moment} date - A Date, in Moment format
 * @return {TypedLiteral} A new typed Literal in {@link RDFTerm} format
 */
export function DateLiteral (date: Moment): TypedLiteral {
  const value = date.toISOString()
  return {
    type: 'literal+type',
    value: value,
    datatype: 'http://www.w3.org/2001/XMLSchema#dateTime',
    asRDF: `"${value}"^^http://www.w3.org/2001/XMLSchema#dateTime`,
    asJS: date
  }
}
