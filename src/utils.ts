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

import { terms } from './rdf-terms'
import { Util } from 'n3'
import { Pipeline } from './engine/pipeline/pipeline'
import { PipelineStage } from './engine/pipeline/pipeline-engine'
import { Algebra } from 'sparqljs'
import { Bindings } from './rdf/bindings'
import { includes, union } from 'lodash'

/**
 * Remove surrounding brackets from an IRI
 * @private
 * @param iri - IRI to cleanup
 * @return Transformed IRI
 */
function cleanIRI (iri: string): string {
  if (iri.startsWith('<') && iri.endsWith('>')) {
    return iri.slice(1, iri.length - 1)
  }
  return iri
}

/**
 * RDF related utilities
 */
export namespace rdf {
  /**
   * Parse a RDF term in string format and return a descriptor with its type and value
   * @param  {string} term - The RDF Term in string format (i.e., URI or Literal)
   * @return A descriptor for the term
   * @throws {SyntaxError} Thrown if an unknown RDF Term is encoutered during parsing
   */
  export function parseTerm (term: string): terms.RDFTerm {
    let parsed = null
    if (Util.isIRI(term)) {
      parsed = terms.createIRI(term)
    } else if (Util.isLiteral(term)) {
      const value = Util.getLiteralValue(term)
      const lang = Util.getLiteralLanguage(term)
      const type = cleanIRI(Util.getLiteralType(term))
      if (lang !== null && lang !== undefined && lang !== '') {
        parsed = terms.createLangLiteral(value, lang)
      } else if (term.indexOf('^^') > -1) {
        parsed = terms.createTypedLiteral(value, type)
      } else {
        parsed = terms.createLiteral(value)
      }
    } else {
      throw new SyntaxError(`Unknown RDF Term encoutered during parsing: ${term}`)
    }
    return parsed
  }

  /**
   * Create a RDF triple in Object representation
   * @param  {string} subj - Triple's subject
   * @param  {string} pred - Triple's predicate
   * @param  {string} obj  - Triple's object
   * @return A RDF triple in Object representation
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
   * @return The number of variables in the Triple Pattern
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
   * @return True if the string is a SPARQL variable, False otherwise
   */
  export function isVariable (str: string): boolean {
    if (typeof str !== 'string') {
      return false
    }
    return str.startsWith('?')
  }

  /**
   * Create an IRI under the XSD namespace
   * @param suffix - Suffix appended to the XSD namespace to create an IRI
   * @return An new IRI, under the XSD namespac
   */
  export function XSD (suffix: string): string {
    return `http://www.w3.org/2001/XMLSchema#${suffix}`
  }

  /**
   * Create an IRI under the RDF namespace
   * @param suffix - Suffix appended to the RDF namespace to create an IRI
   * @return An new IRI, under the RDF namespac
   */
  export function RDF (suffix: string): string {
    return `http://www.w3.org/1999/02/22-rdf-syntax-ns#${suffix}`
  }
}

/**
 * SPARQL related utilities
 */
export namespace sparql {
  /**
   * Get the set of SPARQL variables in a triple pattern
   * @param  pattern - Triple Pattern
   * @return The set of SPARQL variables in the triple pattern
   */
  export function variablesFromPattern (pattern: Algebra.TripleObject): string[] {
    const res: string[] = []
    if (rdf.isVariable(pattern.subject)) {
      res.push(pattern.subject)
    }
    if (rdf.isVariable(pattern.predicate)) {
      res.push(pattern.predicate)
    }
    if (rdf.isVariable(pattern.object)) {
      res.push(pattern.object)
    }
    return res
  }

  /**
   * Perform a join ordering of a set of triple pattern, i.e., a BGP.
   * Sort pattern such as they creates a valid left linear tree without cartesian products (unless it's required to evaluate the BGP)
   * @param  patterns - Set of triple pattern
   * @return Order set of triple patterns
   */
  export function leftLinearJoinOrdering (patterns: Algebra.TripleObject[]): Algebra.TripleObject[] {
    const results: Algebra.TripleObject[] = []
    const x = new Set()
    if (patterns.length > 0) {
      // sort pattern by join predicate
      let p = patterns.shift()!
      let variables = variablesFromPattern(p)
      results.push(p)
      while (patterns.length > 0) {
        // find the next pattern with a common join predicate
        let index = patterns.findIndex(pattern => {
          return includes(variables, pattern.subject) || includes(variables, pattern.predicate) || includes(variables, pattern.object)
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
}

/**
 * Bound a triple pattern using a set of bindings, i.e., substitute variables in the triple pattern
 * using the set of bindings provided
 * @param triple  - Triple pattern
 * @param bindings - Set of bindings
 * @return An new, bounded triple pattern
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
 * Recursively apply bindings to every triple in a SPARQL group pattern
 * @param  group - SPARQL group pattern to process
 * @param  bindings - Set of bindings to use
 * @return A new SPARQL group pattern with triples bounded
 */
export function deepApplyBindings (group: Algebra.PlanNode, bindings: Bindings): Algebra.PlanNode {
  switch (group.type) {
    case 'bgp':
      // WARNING property paths are not supported here
      const triples = (group as Algebra.BGPNode).triples as Algebra.TripleObject[]
      const bgp: Algebra.BGPNode = {
        type: 'bgp',
        triples: triples.map(t => bindings.bound(t))
      }
      return bgp
    case 'group':
    case 'optional':
    case 'service':
    case 'union':
      const newGroup: Algebra.GroupNode = {
        type: group.type,
        patterns: (group as Algebra.GroupNode).patterns.map(g => deepApplyBindings(g, bindings))
      }
      return newGroup
    case 'query':
      let subQuery: Algebra.RootNode = (group as Algebra.RootNode)
      subQuery.where = subQuery.where.map(g => deepApplyBindings(g, bindings))
      return subQuery
    default:
      return group
  }
}

/**
 * Extends all set of bindings produced by an iterator with another set of bindings
 * @param  source - Source {@link PipelineStage}
 * @param  bindings - Bindings added to each set of bindings procuded by the iterator
 * @return A {@link PipelineStage} that extends bindins produced by the source iterator
 */
export function extendByBindings (source: PipelineStage<Bindings>, bindings: Bindings): PipelineStage<Bindings> {
  return Pipeline.getInstance().map(source, (b: Bindings) => bindings.union(b))
}
