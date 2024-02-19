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

import * as crypto from 'crypto'
import { includes, union } from 'lodash'
import * as SPARQL from 'sparqljs'
import * as rdf from './rdf.js'

/**
 * SPARQL related utilities
 */

export type Triple = {
  subject: SPARQL.Triple['subject']
  predicate: SPARQL.Triple['predicate']
  object: SPARQL.Triple['object']
}

/**
 * Bounded values allowed for a triple subject, predicate or object
 */
export type BoundedTripleValue = rdf.NamedNode | rdf.Literal | rdf.BlankNode

// A triple value which may be unbounded
export type UnBoundedTripleValue = BoundedTripleValue | rdf.Variable

export type NoPathTriple = {
  subject: SPARQL.Triple['subject']
  predicate: Exclude<SPARQL.Triple['predicate'], SPARQL.PropertyPath>
  object: SPARQL.Triple['object']
}

//TODO Q is it valid to remove quad from here?
export type PropertyPathTriple = {
  subject: Exclude<SPARQL.Triple['subject'], rdf.Quad>
  predicate: SPARQL.PropertyPath
  object: Exclude<SPARQL.Triple['object'], rdf.Quad>
}

/**
 * Create a SPARQL.Triple with the given subject, predicate and object that is untested
 * allowing potentially invalid triples to be created for temporary use.
 * @param subject
 * @param predicate
 * @param object
 */
export function createLooseTriple(
  subject: rdf.Term,
  predicate: rdf.Term,
  object: rdf.Term,
): SPARQL.Triple {
  return {
    subject,
    predicate,
    object,
  } as SPARQL.Triple
}

export function createStrongTriple(
  subject: rdf.Term,
  predicate: rdf.Term,
  object: rdf.Term,
): SPARQL.Triple {
  if (
    !(
      rdf.isNamedNode(subject) ||
      rdf.isBlankNode(subject) ||
      rdf.isVariable(subject) ||
      rdf.isQuad(subject)
    )
  ) {
    throw new Error(`Invalid subject ${subject}`)
  }
  if (
    !(
      rdf.isNamedNode(predicate) ||
      rdf.isVariable(predicate) ||
      rdf.isPropertyPath(predicate)
    )
  ) {
    throw new Error(`Invalid predicate ${predicate}`)
  }
  return {
    subject,
    predicate,
    object,
  } as SPARQL.Triple
}

/**
 * Hash Basic Graph pattern to assign them an unique ID
 * @param bgp - Basic Graph Pattern to hash
 * @param md5 - True if the ID should be hashed to md5, False to keep it as a plain text string
 * @return An unique ID to identify the BGP
 */
export function hashBGP(bgp: SPARQL.Triple[], md5: boolean = false): string {
  const hashedBGP = bgp.map(rdf.hashTriple).join(';')
  if (!md5) {
    return hashedBGP
  }
  const hash = crypto.createHash('md5')
  hash.update(hashedBGP)
  return hash.digest('hex')
}

/**
 * Get the set of SPARQL variables in a triple pattern
 * @param  pattern - Triple Pattern
 * @return The set of SPARQL variables in the triple pattern
 */
export function variablesFromPattern(pattern: SPARQL.Triple): string[] {
  const res: string[] = []
  if (rdf.isVariable(pattern.subject)) {
    res.push(pattern.subject.value)
  }
  if (
    !rdf.isPropertyPath(pattern.predicate) &&
    rdf.isVariable(pattern.predicate)
  ) {
    res.push(pattern.predicate.value)
  }
  if (rdf.isVariable(pattern.object)) {
    res.push(pattern.object.value)
  }
  return res
}

/**
 * Perform a join ordering of a set of triple pattern, i.e., a BGP.
 * Sort pattern such as they creates a valid left linear tree without cartesian products (unless it's required to evaluate the BGP)
 * @param  patterns - Set of triple pattern
 * @return Order set of triple patterns
 */
export function leftLinearJoinOrdering(
  patterns: SPARQL.Triple[],
): SPARQL.Triple[] {
  const results: SPARQL.Triple[] = []
  if (patterns.length > 0) {
    // sort pattern by join predicate
    let p = patterns.shift()!
    let variables = variablesFromPattern(p)
    results.push(p)
    while (patterns.length > 0) {
      // find the next pattern with a common join predicate
      let index = patterns.findIndex((pattern) => {
        if (rdf.isPropertyPath(pattern.predicate)) {
          return (
            includes(variables, pattern.subject.value) ||
            includes(variables, pattern.object.value)
          )
        }
        return (
          includes(variables, pattern.subject.value) ||
          includes(variables, pattern.predicate.value) ||
          includes(variables, pattern.object.value)
        )
      })
      // if not found, trigger a cartesian product with the first pattern of the sorted set
      if (index < 0) {
        index = 0
      }
      // get the new pattern to join with
      p = patterns.splice(index, 1)[0]
      variables = union(variables, variablesFromPattern(p))
      results.push(p)
    }
  }
  return results
}
