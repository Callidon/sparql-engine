/* file : rewritings.ts
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

import * as SPARQL from 'sparqljs'
import { namespace, rdf } from '../../utils/index.js'

/**
 * A Full Text Search query
 */
export interface FullTextSearchQuery {
  /** The pattern queried by the full text search */
  pattern: SPARQL.Triple
  /** The SPARQL varibale on which the full text search is performed */
  variable: rdf.Variable
  /** The magic triples sued to configured the full text search query */
  magicTriples: SPARQL.Triple[]
}

/**
 * The results of extracting full text search queries from a BGP
 */
export interface ExtractionResults {
  /** The set of full text search queries extracted from the BGP */
  queries: FullTextSearchQuery[]
  /** Regular triple patterns, i.e., those who should be evaluated as a regular BGP */
  classicPatterns: SPARQL.Triple[]
}

/**
 * Extract all full text search queries from a BGP, using magic triples to identify them.
 * A magic triple is an IRI prefixed by 'https://callidon.github.io/sparql-engine/search#' (ses:search, ses:rank, ses:minRank, etc).
 * @param bgp - BGP to analyze
 * @return The extraction results
 */
export function extractFullTextSearchQueries(
  bgp: SPARQL.Triple[],
): ExtractionResults {
  const queries: FullTextSearchQuery[] = []
  const classicPatterns: SPARQL.Triple[] = []
  // find, validate and group all magic triples per query variable
  const patterns: SPARQL.Triple[] = []
  const magicGroups = new Map<string, SPARQL.Triple[]>()
  const prefix = namespace.SES('').value
  bgp.forEach((triple) => {
    // A magic triple is an IRI prefixed by 'https://callidon.github.io/sparql-engine/search#'
    if (
      rdf.isNamedNode(triple.predicate) &&
      triple.predicate.value.startsWith(prefix)
    ) {
      // assert that the magic triple's subject is a variable
      if (!rdf.isVariable(triple.subject)) {
        throw new SyntaxError(
          `Invalid Full Text Search query: the subject of the magic triple ${triple} must a valid URI/IRI.`,
        )
      }
      if (!magicGroups.has(triple.subject.value)) {
        magicGroups.set(triple.subject.value, [triple])
      } else {
        magicGroups.get(triple.subject.value)!.push(triple)
      }
    } else {
      patterns.push(triple)
    }
  })
  // find all triple pattern whose object is the subject of some magic triples
  patterns.forEach((pattern) => {
    const subjectVariable = pattern.subject as rdf.Variable
    const objectVariable = pattern.object as rdf.Variable
    if (magicGroups.has(subjectVariable.value)) {
      queries.push({
        pattern,
        variable: subjectVariable,
        magicTriples: magicGroups.get(subjectVariable.value)!,
      })
    } else if (magicGroups.has(objectVariable.value)) {
      queries.push({
        pattern,
        variable: objectVariable,
        magicTriples: magicGroups.get(objectVariable.value)!,
      })
    } else {
      classicPatterns.push(pattern)
    }
  })
  return { queries, classicPatterns }
}
