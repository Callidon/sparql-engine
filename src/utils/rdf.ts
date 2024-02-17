/* file : utils.ts
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

import DataFactory from '@rdfjs/data-model'
import * as RDF from '@rdfjs/types'
import { ISO_8601, Moment, parseZone } from 'moment'
import { stringToTerm, termToString } from 'rdf-string'
import * as SPARQL from 'sparqljs'
import { XSD } from './namespace.js'

/**
 * RDF related utilities
 */

export type NamedNode = RDF.NamedNode
export type Variable = RDF.Variable
export type Literal = RDF.Literal
export type BlankNode = RDF.BlankNode
export type Term = SPARQL.Term
export type Quad = RDF.Quad
/**
 * Values allowed for a triple subject, predicate or object
 */
export type TripleValue = Variable | NamedNode | Literal | BlankNode

/**
 * Test if two triple (patterns) are equals
 * @param a - First triple (pattern)
 * @param b - Second triple (pattern)
 * @return True if the two triple (patterns) are equals, False otherwise
 */
export function tripleEquals(a: SPARQL.Triple, b: SPARQL.Triple): boolean {
  if (
    a.subject.termType !== b.subject.termType ||
    a.object.termType !== b.object.termType
  ) {
    return false
  } else if (isPropertyPath(a.predicate) && isPropertyPath(b.predicate)) {
    return (
      a.subject.equals(b.subject) &&
      JSON.stringify(a.predicate) === JSON.stringify(b.predicate) &&
      a.object.equals(b.object)
    )
  } else if (
    (a.predicate as SPARQL.Term).termType !==
    (b.predicate as SPARQL.Term).termType
  ) {
    return false
  } else {
    return (
      a.subject.equals(b.subject) &&
      (a.predicate as SPARQL.Term).equals(b.predicate as SPARQL.Term) &&
      a.object.equals(b.object)
    )
  }
  return false
}

/**
 * Convert an string RDF Term to a RDFJS representation
 * @see https://rdf.js.org/data-model-spec
 * @param term - A string-based term representation
 * @return A RDF.js term
 */
export function fromN3(term: string): Term {
  return stringToTerm(term) as Term
}

/**
 * Convert an RDFJS term to a string-based representation
 * @see https://rdf.js.org/data-model-spec
 * @param term A RDFJS term
 * @return A string-based term representation
 */
export function toN3(term: Term | SPARQL.PropertyPath): string {
  if (isPropertyPath(term)) {
    throw new Error('Cannot convert a property path to N3')
  }
  return termToString(term)
}

/**
 * Parse a RDF Literal to its Javascript representation
 * @see https://www.w3.org/TR/rdf11-concepts/#section-Datatypes
 * @param value - Literal value
 * @param type - Literal datatype
 * @return Javascript representation of the literal
 */
export function asJS<T>(value: string, type: string | null): T {
  switch (type) {
    case XSD.integer.value:
    case XSD.byte.value:
    case XSD.short.value:
    case XSD.int.value:
    case XSD.unsignedByte.value:
    case XSD.unsignedShort.value:
    case XSD.unsignedInt.value:
    case XSD.number.value:
    case XSD.float.value:
    case XSD.decimal.value:
    case XSD.double.value:
    case XSD.long.value:
    case XSD.unsignedLong.value:
    case XSD.positiveInteger.value:
    case XSD.nonPositiveInteger.value:
    case XSD.negativeInteger.value:
    case XSD.nonNegativeInteger.value:
      return Number(value) as T
    case XSD.boolean.value:
      return (value === 'true' || value === '1') as T
    case XSD.dateTime.value:
    case XSD.dateTimeStamp.value:
    case XSD.date.value:
    case XSD.time.value:
    case XSD.duration.value:
      return parseZone(value, ISO_8601) as T
    case XSD.hexBinary.value:
      return Buffer.from(value, 'hex') as T
    case XSD.base64Binary.value:
      return Buffer.from(value, 'base64') as T
    default:
      return value as T
  }
}

/**
 * Creates an IRI in RDFJS format
 * @param value - IRI value
 * @return A new IRI in RDFJS format
 */
export function createIRI(value: string): NamedNode {
  checkValue(value)
  if (value.startsWith('<') && value.endsWith('>')) {
    return DataFactory.namedNode(value.slice(0, value.length - 1))
  }
  return DataFactory.namedNode(value)
}

/**
 * Creates a Blank Node in RDFJS format
 * @param value - Blank node value
 * @return A new Blank Node in RDFJS format
 */
export function createBNode(value?: string): BlankNode {
  checkValue(value ?? '')
  return DataFactory.blankNode(value)
}

/**
 * Creates a Literal in RDFJS format, without any datatype or language tag
 * @param value - Literal value
 * @return A new literal in RDFJS format
 */
export function createLiteral(value: string): Literal {
  checkValue(value)
  return DataFactory.literal(value)
}

/**
 * Creates an typed Literal in RDFJS format
 * @param value - Literal value
 * @param type - Literal type (integer, float, dateTime, ...)
 * @return A new typed Literal in RDFJS format
 */
export function createTypedLiteral(value: unknown, type?: NamedNode): Literal {
  return DataFactory.literal(`${value}`, type)
}

/**
 * Creates a Literal with a language tag in RDFJS format
 * @param value - Literal value
 * @param language - Language tag (en, fr, it, ...)
 * @return A new Literal with a language tag in RDFJS format
 */
export function createLangLiteral(value: string, language: string): Literal {
  return DataFactory.literal(value, language)
}

function checkValue(value: string) {
  if (value.startsWith('[') && value.endsWith(']')) {
    throw new Error(`Invalid variable name ${value}`)
  }
}

/**
 * Creates a SPARQL variable in RDF/JS format
 * @param value Variable value
 * @returns A new SPARQL Variable
 */
export function createVariable(value: string): Variable {
  checkValue(value)
  if (value.startsWith('?')) {
    return DataFactory.variable(value.substring(1))
  }
  return DataFactory.variable(value)
}

/**
 * Creates an integer Literal in RDFJS format
 * @param value - Integer
 * @return A new integer in RDFJS format
 */
export function createInteger(value: number): Literal {
  return createTypedLiteral(value, XSD.integer)
}

/**
 * Creates an float Literal in RDFJS format
 * @param value - Float
 * @return A new float in RDFJS format
 */
export function createFloat(value: number): Literal {
  return createTypedLiteral(value, XSD.float)
}

/**
 * Creates a Literal from a boolean, in RDFJS format
 * @param value - Boolean
 * @return A new boolean in RDFJS format
 */
export function createBoolean(value: boolean): Literal {
  return value ? createTrue() : createFalse()
}

/**
 * Creates a True boolean, in RDFJS format
 * @return A new boolean in RDFJS format
 */
export function createTrue(): Literal {
  return createTypedLiteral('true', XSD.boolean)
}

/**
 * Creates a False boolean, in RDFJS format
 * @return A new boolean in RDFJS format
 */
export function createFalse(): Literal {
  return createTypedLiteral('false', XSD.boolean)
}

/**
 * Creates a Literal from a Moment.js date, in RDFJS format
 * @param date - Date, in Moment.js format
 * @return A new date literal in RDFJS format
 */
export function createDate(date: Moment): Literal {
  return createTypedLiteral(date.toISOString(), XSD.dateTime)
}

/**
 * Creates an unbounded literal, used when a variable is not bounded in a set of bindings
 * @return A new literal in RDFJS format
 */
export function createUnbound(): Literal {
  return createLiteral('UNBOUND')
}

/**
 * Clone a literal and replace its value with another one
 * @param  base     - Literal to clone
 * @param  newValue - New literal value
 * @return The literal with its new value
 */
export function shallowCloneTerm(term: Term, newValue: string): Term {
  if (isLiteral(term)) {
    if (term.language !== '') {
      return createLangLiteral(newValue, term.language)
    }
    return createTypedLiteral(newValue, term.datatype)
  }
  return createLiteral(newValue)
}

/**
 * Test if given is an RDFJS Term
 * @param toTest
 * @return True of the term RDFJS Term, False otherwise
 */
export function isTerm(term: unknown): term is Term {
  return (term as Term).termType !== undefined
}

/**
 * Test if a RDFJS Term is a Variable
 * @param term - RDFJS Term
 * @return True of the term is a Variable, False otherwise
 */
export function isVariable(term: Term | SPARQL.PropertyPath): term is Variable {
  return (term as Term)?.termType === 'Variable'
}

/**
 * Test if a RDFJS Term is a Variable
 * @param term - RDFJS Term
 * @return True of the term is a Variable, False otherwise
 */
export function isWildcard(
  term: Term | SPARQL.PropertyPath | SPARQL.Wildcard | SPARQL.Variable,
): term is SPARQL.Wildcard {
  return (term as SPARQL.Wildcard)?.termType === 'Wildcard'
}

/**
 * Test if a RDFJS Term is a Literal
 * @param term - RDFJS Term
 * @return True of the term is a Literal, False otherwise
 */
export function isLiteral(term: Term | SPARQL.PropertyPath): term is Literal {
  return (term as Term).termType === 'Literal'
}

/**
 * Test if a RDFJS Term is an IRI, i.e., a NamedNode
 * @param term - RDFJS Term
 * @return True of the term is an IRI, False otherwise
 */
export function isNamedNode(
  term: Term | SPARQL.PropertyPath,
): term is NamedNode {
  return (term as Term).termType === 'NamedNode'
}

/**
 * Test if a RDFJS Term is a Blank Node
 * @param term - RDFJS Term
 * @return True of the term is a Blank Node, False otherwise
 */
export function isBlankNode(
  term: Term | SPARQL.PropertyPath,
): term is BlankNode {
  return (term as Term).termType === 'BlankNode'
}

/**
 * Test if a RDFJS Term is a Variable
 * @param term - RDFJS Term
 * @return True of the term is a Variable, False otherwise
 */
export function isQuad(term: Term | SPARQL.PropertyPath): term is Quad {
  return (term as Term).termType === 'Quad'
}

/**
 * Return True if a RDF predicate is a property path
 * @param predicate Predicate to test
 * @returns True if the predicate is a property path, False otherwise
 */
export function isPropertyPath(
  predicate: SPARQL.Term | SPARQL.PropertyPath,
): predicate is SPARQL.PropertyPath {
  return (predicate as SPARQL.PropertyPath).type === 'path'
}

/**
 * Test if a RDFJS Literal is a number
 * @param literal - RDFJS Literal
 * @return True of the Literal is a number, False otherwise
 */
export function literalIsNumeric(literal: Literal): boolean {
  switch (literal.datatype.value) {
    case XSD.integer.value:
    case XSD.byte.value:
    case XSD.short.value:
    case XSD.int.value:
    case XSD.unsignedByte.value:
    case XSD.unsignedShort.value:
    case XSD.unsignedInt.value:
    case XSD.number.value:
    case XSD.float.value:
    case XSD.decimal.value:
    case XSD.double.value:
    case XSD.long.value:
    case XSD.unsignedLong.value:
    case XSD.positiveInteger.value:
    case XSD.nonPositiveInteger.value:
    case XSD.negativeInteger.value:
    case XSD.nonNegativeInteger.value:
      return true
    default:
      return false
  }
}

/**
 * Test if a RDFJS Literal is a date
 * @param literal - RDFJS Literal
 * @return True of the Literal is a date, False otherwise
 */
export function literalIsDate(literal: Literal): boolean {
  return XSD('dateTime').equals(literal.datatype)
}

/**
 * Test if a RDFJS Literal is a boolean
 * @param term - RDFJS Literal
 * @return True of the Literal is a boolean, False otherwise
 */
export function literalIsBoolean(literal: Literal): boolean {
  return XSD('boolean').equals(literal.datatype)
}

/**
 * Test if two RDFJS Terms are equals
 * @param a - First Term
 * @param b - Second Term
 * @return True if the two RDFJS Terms are equals, False
 */
export function termEquals(a: Term, b: Term): boolean {
  if (isLiteral(a) && isLiteral(b)) {
    if (literalIsDate(a) && literalIsDate(b)) {
      const valueA: Moment = asJS(a.value, a.datatype.value)
      const valueB: Moment = asJS(b.value, b.datatype.value)
      // use Moment.js isSame function to compare two dates
      return valueA.isSame(valueB)
    }
    return (
      a.value === b.value &&
      a.datatype.value === b.datatype.value &&
      a.language === b.language
    )
  }
  return a.value === b.value
}

/**
 * Count the number of variables in a Triple Pattern
 * @param  {Object} triple - Triple Pattern to process
 * @return The number of variables in the Triple Pattern
 */
export function countVariables(triple: SPARQL.Triple): number {
  let count = 0
  if (isVariable(triple.subject)) {
    count++
  }
  if (!isPropertyPath(triple.predicate) && isVariable(triple.predicate)) {
    count++
  }
  if (isVariable(triple.object)) {
    count++
  }
  return count
}

/**
 * Hash Triple (pattern) to assign it an unique ID
 * @param triple - Triple (pattern) to hash
 * @return An unique ID to identify the Triple (pattern)
 */
export function hashTriple(triple: SPARQL.Triple): string {
  return `s=${toN3(triple.subject)}&p=${toN3(triple.predicate)}&o=${toN3(triple.object)}`
}
