/* file : utils.ts
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

import * as terms from './rdf-terms'
import { Util } from 'n3'
import { AsyncIterator } from 'asynciterator'
import { Algebra } from 'sparqljs'
import { Bindings } from './rdf/bindings'

function stripDatatype (datatype: string): string {
  if (datatype.startsWith('<') && datatype.endsWith('>')) {
    return datatype.slice(1, datatype.length - 1)
  }
  return datatype
}

/**
 * RDF related utilities
 */
export namespace rdf {
  /**
  * Parse a RDF term in string format and return a descriptor with its type and value
  * @param  {string} binding - The binding in string format (i.e., URI or Literal)
  * @return {Object} A descriptor for the term
  */
  export function parseTerm (term: string): terms.RDFTerm {
    let parsed = null
    if (Util.isIRI(term)) {
      parsed = terms.IRIDescriptor(term)
    } else if (Util.isLiteral(term)) {
      const value = Util.getLiteralValue(term)
      const lang = Util.getLiteralLanguage(term)
      const type = stripDatatype(Util.getLiteralType(term))
      if (lang !== null && lang !== undefined && lang !== '') {
        parsed = terms.LangLiteralDescriptor(value, lang)
      } else if (term.indexOf('^^') > -1) {
        parsed = terms.TypedLiteralDescriptor(value, type)
      } else {
        parsed = terms.RawLiteralDescriptor(value)
      }
    } else {
      throw new Error(`Unknown RDF Term encoutered during parsing: ${term}`)
    }
    return parsed
  }

  /**
  * Parse a solution binding and return a descriptor with its type and value
  * @param  {string} variable - The SPARQL variable that the binding bound
  * @param  {string} binding - The binding in string format (i.e., URI or Literal)
  * @return {Object} A descriptor for the binding
  */
  // export function parseBinding (variable: string, binding: string) {
  //   const parsed = parseTerm(binding)
  //   parsed.variable = variable
  //   return parsed
  // }

  /**
  * Create a RDF triple in Object representation
  * @param  {string} subj - Triple's subject
  * @param  {string} pred - Triple's predicate
  * @param  {string} obj  - Triple's object
  * @return {Object} A RDF triple in Object representation
  */
  export function triple (subj: string, pred: string, obj: string): Algebra.TripleObject {
    return {
      subject: subj,
      predicate: pred,
      object: obj
    }
  }

  /**
  * Count the number of variables in a Triple Pattern
  * @param  {Object} triple - Triple Pattern to process
  * @return {integer} The number of variables in the Triple Pattern
  */
  export function countVariables (triple: Algebra.TripleObject): number {
    let count = 0
    if (isVariable(triple.subject)) {
      count++
    }
    if (isVariable(triple.predicate)) {
      count++
    }
    if (isVariable(triple.object)) {
      count++
    }
    return count
  }

  /**
  * Return True if a string is a SPARQL variable
  * @param  {string}  str - String to test
  * @return {Boolean} True if the string is a SPARQL variable, False otherwise
  */
  export function isVariable (str: string): boolean {
    if (typeof str !== 'string') {
      return false
    }
    return str.startsWith('?')
  }

  export function XSD (term: string): string {
    return `http://www.w3.org/2001/XMLSchema#${term}`
  }

  export function RDF (term: string): string {
    return `http://www.w3.org/1999/02/22-rdf-syntax-ns#${term}`
  }
}


/**
 * Bound a triple pattern using a set of bindings, i.e., substitute variables in the triple pattern
 * using the set of bindings provided
 * @param {Object} triple  - Triple pattern
 * @param {Object} bindings - Set of bindings
 * @return {function} An new, bounded triple pattern
 */
export function applyBindings (triple: Algebra.TripleObject, bindings: Bindings): Algebra.TripleObject {
  const newTriple = Object.assign({}, triple)
  if (triple.subject.startsWith('?') && bindings.has(triple.subject)) {
    newTriple.subject = bindings.get(triple.subject)!
  }
  if (triple.predicate.startsWith('?') && bindings.has(triple.predicate)) {
    newTriple.predicate = bindings.get(triple.predicate)!
  }
  if (triple.object.startsWith('?') && bindings.has(triple.object)) {
    newTriple.object = bindings.get(triple.object)!
  }
  return newTriple
}

/**
 * Recusrively apply bindings to every triple in a SPARQL group pattern
 * @param  {Object} group - SPARQL group pattern to process
 * @param  {Object} bindings - Set of bindings to use
 * @return {Object} A new SPARQL group pattern with triples bounded
 */
export function deepApplyBindings (group: Algebra.PlanNode, bindings: Bindings): Algebra.PlanNode {
  switch (group.type) {
    case 'bgp':
      const bgp: Algebra.BGPNode = {
        type: 'bgp',
        triples: (<Algebra.BGPNode> group).triples.map(t => bindings.bound(t))
      }
      return bgp
    case 'group':
    case 'optional':
    case 'service':
    case 'union':
      const newGroup: Algebra.GroupNode = {
        type: group.type,
        patterns: (<Algebra.GroupNode> group).patterns.map(g => deepApplyBindings(g, bindings))
      }
      return newGroup
    case 'query':
      let subQuery: Algebra.RootNode = (<Algebra.RootNode> group)
      subQuery.where = subQuery.where.map(g => deepApplyBindings(g, bindings))
      return subQuery
    default:
      return group
  }
}

/**
 * Extends all set of bindings produced by an iterator with another set of bindings
 * @param  {AsyncIterator} iterator - Source terator
 * @param  {Object} bindings - Bindings added to each set of bindings procuded by the iterator
 * @return {AsyncIterator} An iterator that extends bindins produced by the source iterator
 */
export function extendByBindings (iterator: AsyncIterator<Bindings>, bindings: Bindings): AsyncIterator<Bindings> {
  return iterator.map((b: Bindings) => bindings.union(b))
}
