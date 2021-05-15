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

import * as SPARQL from 'sparqljs'
import { BGPCache } from './engine/cache/bgp-cache'
import { Bindings, BindingBase } from './rdf/bindings'
import { BlankNode, Literal, NamedNode, Quad, Term, Variable } from 'rdf-js'
import { includes, union } from 'lodash'
import { parseZone, Moment, ISO_8601 } from 'moment'
import { Pipeline } from './engine/pipeline/pipeline'
import { PipelineStage } from './engine/pipeline/pipeline-engine'
import { termToString, stringToTerm } from 'rdf-string'
import * as crypto from 'crypto'
import * as DataFactory from '@rdfjs/data-model'
import * as uuid from 'uuid/v4'
import BGPStageBuilder from './engine/stages/bgp-stage-builder'
import ExecutionContext from './engine/context/execution-context'
import ContextSymbols from './engine/context/symbols'
import Graph from './rdf/graph'

/**
 * RDF related utilities
 */
export namespace rdf {

  /**
   * Values allowed for a triple subject, predicate or object
   */
  export type TripleValue = Variable | NamedNode | Literal | BlankNode

  /**
   * Bounded values allowed for a triple subject, predicate or object
   */
   export type BoundedTripleValue = NamedNode | Literal

  /**
   * Test if two triple (patterns) are equals
   * @param a - First triple (pattern)
   * @param b - Second triple (pattern)
   * @return True if the two triple (patterns) are equals, False otherwise
   */
  export function tripleEquals (a: SPARQL.Triple, b: SPARQL.Triple): boolean {
    if (a.subject.termType !== b.subject.termType || a.object.termType !== b.object.termType) {
      return false
    } else if (predicateIsPropertyPath(a.predicate) && predicateIsPropertyPath(b.predicate)) {
      return a.subject.equals(b.subject) && JSON.stringify(a.predicate) === JSON.stringify(b.predicate) && a.object.equals(b.object)
    } else if ((a.predicate as SPARQL.Term).termType !== (b.predicate as SPARQL.Term).termType) {
      return false
    } else {
      return a.subject.equals(b.subject) && (a.predicate as SPARQL.Term).equals((b.predicate as SPARQL.Term)) && a.object.equals(b.object)
    }
    return false
  }

  /**
   * Convert an string RDF Term to a RDF/JS representation
   * @see https://rdf.js.org/data-model-spec
   * @param term - A string-based term representation
   * @return A RDF.js term
   */
  export function fromN3 (term: string): Term {
    return stringToTerm(term)
  }

  /**
   * Convert an RDF/JS term to a string-based representation
   * @see https://rdf.js.org/data-model-spec
   * @param term A RDF/JS term
   * @return A string-based term representation
   */
  export function toN3 (term: Term): string {
    return termToString(term)
  }

  /**
   * Parse a RDF Literal to its Javascript representation
   * @see https://www.w3.org/TR/rdf11-concepts/#section-Datatypes
   * @param value - Literal value
   * @param type - Literal datatype
   * @return Javascript representation of the literal
   */
  export function asJS (value: string, type: string | null): any {
    switch (type) {
      case XSD('integer'):
      case XSD('byte'):
      case XSD('short'):
      case XSD('int'):
      case XSD('unsignedByte'):
      case XSD('unsignedShort'):
      case XSD('unsignedInt'):
      case XSD('number'):
      case XSD('float'):
      case XSD('decimal'):
      case XSD('double'):
      case XSD('long'):
      case XSD('unsignedLong'):
      case XSD('positiveInteger'):
      case XSD('nonPositiveInteger'):
      case XSD('negativeInteger'):
      case XSD('nonNegativeInteger'):
        return Number(value)
      case XSD('boolean'):
        return value === 'true' || value === '1'
      case XSD('dateTime'):
      case XSD('dateTimeStamp'):
      case XSD('date'):
      case XSD('time'):
      case XSD('duration'):
        return parseZone(value, ISO_8601)
      case XSD('hexBinary'):
        return Buffer.from(value, 'hex')
      case XSD('base64Binary'):
        return Buffer.from(value, 'base64')
      default:
        return value
    }
  }

  /**
   * Creates an IRI in RDF/JS format
   * @param value - IRI value
   * @return A new IRI in RDF/JS format
   */
  export function createIRI (value: string): NamedNode {
    if (value.startsWith('<') && value.endsWith('>')) {
      return DataFactory.namedNode(value.slice(0, value.length - 1))
    }
    return DataFactory.namedNode(value)
  }

  /**
   * Creates a Blank Node in RDF/JS format
   * @param value - Blank node value
   * @return A new Blank Node in RDF/JS format
   */
  export function createBNode (value?: string): BlankNode {
    return DataFactory.blankNode(value)
  }

  /**
   * Creates a Literal in RDF/JS format, without any datatype or language tag
   * @param value - Literal value
   * @return A new literal in RDF/JS format
   */
  export function createLiteral (value: string): Literal {
    return DataFactory.literal(value)
  }

  /**
   * Creates an typed Literal in RDF/JS format
   * @param value - Literal value
   * @param type - Literal type (integer, float, dateTime, ...)
   * @return A new typed Literal in RDF/JS format
   */
  export function createTypedLiteral (value: any, type: string): Literal {
    return DataFactory.literal(`${value}`, createIRI(type))
  }

  /**
   * Creates a Literal with a language tag in RDF/JS format
   * @param value - Literal value
   * @param language - Language tag (en, fr, it, ...)
   * @return A new Literal with a language tag in RDF/JS format
   */
  export function createLangLiteral (value: string, language: string): Literal {
    return DataFactory.literal(value, language)
  }

  /**
   * Creates a SPARQL variable in RDF/JS format
   * @param value Variable value
   * @returns A new SPARQL Variable
   */
  export function createVariable(value: string): Variable {
    if (value.startsWith('?')) {
      return DataFactory.variable(value.substring(1))
    }
    return DataFactory.variable(value)
  }

  /**
   * Creates an integer Literal in RDF/JS format
   * @param value - Integer
   * @return A new integer in RDF/JS format
   */
  export function createInteger (value: number): Literal {
    return createTypedLiteral(value, XSD('integer'))
  }

  /**
   * Creates an float Literal in RDF/JS format
   * @param value - Float
   * @return A new float in RDF/JS format
   */
  export function createFloat (value: number): Literal {
    return createTypedLiteral(value, XSD('float'))
  }

  /**
   * Creates a Literal from a boolean, in RDF/JS format
   * @param value - Boolean
   * @return A new boolean in RDF/JS format
   */
  export function createBoolean (value: boolean): Literal {
    return value ? createTrue() : createFalse()
  }

  /**
   * Creates a True boolean, in RDF/JS format
   * @return A new boolean in RDF/JS format
   */
  export function createTrue (): Literal {
    return createTypedLiteral('true', XSD('boolean'))
  }

  /**
   * Creates a False boolean, in RDF/JS format
   * @return A new boolean in RDF/JS format
   */
  export function createFalse (): Literal {
    return createTypedLiteral('false', XSD('boolean'))
  }

  /**
   * Creates a Literal from a Moment.js date, in RDF/JS format
   * @param date - Date, in Moment.js format
   * @return A new date literal in RDF/JS format
   */
  export function createDate (date: Moment): Literal {
    return createTypedLiteral(date.toISOString(), XSD('dateTime'))
  }

  /**
   * Creates an unbounded literal, used when a variable is not bounded in a set of bindings
   * @return A new literal in RDF/JS format
   */
  export function createUnbound (): Literal {
    return createLiteral('UNBOUND')
  }

  /**
   * Clone a literal and replace its value with another one
   * @param  base     - Literal to clone
   * @param  newValue - New literal value
   * @return The literal with its new value
   */
  export function shallowCloneTerm (term: Term, newValue: string): Term {
    if (termIsLiteral(term)) {
      if (term.language !== '') {
        return createLangLiteral(newValue, term.language)
      }
      return createTypedLiteral(newValue, term.datatype.value)
    }
    return createLiteral(newValue)
  }

  /**
   * Test if a RDF/JS Term is a Literal
   * @param term - RDF/JS Term
   * @return True of the term is a Literal, False otherwise
   */
  export function termIsLiteral (term: Term): term is Literal {
    return term.termType === 'Literal'
  }

  /**
   * Test if a RDF/JS Term is an IRI, i.e., a NamedNode
   * @param term - RDF/JS Term
   * @return True of the term is an IRI, False otherwise
   */
  export function termIsIRI (term: Term): term is NamedNode {
    return term.termType === 'NamedNode'
  }

  /**
   * Test if a RDF/JS Term is a Blank Node
   * @param term - RDF/JS Term
   * @return True of the term is a Blank Node, False otherwise
   */
  export function termIsBNode (term: Term): term is BlankNode {
    return term.termType === 'BlankNode'
  }

  /**
   * Test if a RDF/JS Literal is a number
   * @param literal - RDF/JS Literal
   * @return True of the Literal is a number, False otherwise
   */
  export function literalIsNumeric (literal: Literal): boolean {
    switch (literal.datatype.value) {
      case XSD('integer'):
      case XSD('byte'):
      case XSD('short'):
      case XSD('int'):
      case XSD('unsignedByte'):
      case XSD('unsignedShort'):
      case XSD('unsignedInt'):
      case XSD('number'):
      case XSD('float'):
      case XSD('decimal'):
      case XSD('double'):
      case XSD('long'):
      case XSD('unsignedLong'):
      case XSD('positiveInteger'):
      case XSD('nonPositiveInteger'):
      case XSD('negativeInteger'):
      case XSD('nonNegativeInteger'):
        return true
      default:
        return false
    }
  }

  /**
   * Test if a RDF/JS Literal is a date
   * @param literal - RDF/JS Literal
   * @return True of the Literal is a date, False otherwise
   */
  export function literalIsDate (literal: Literal): boolean {
    return literal.datatype.value === XSD('dateTime')
  }

  /**
   * Test if a RDF/JS Literal is a boolean
   * @param term - RDF/JS Literal
   * @return True of the Literal is a boolean, False otherwise
   */
  export function literalIsBoolean (literal: Literal): boolean {
    return literal.datatype.value === XSD('boolean')
  }

  /**
   * Test if two RDF/JS Terms are equals
   * @param a - First Term
   * @param b - Second Term
   * @return True if the two RDF/JS Terms are equals, False
   */
  export function termEquals (a: Term, b: Term): boolean {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      if (literalIsDate(a) && literalIsDate(b)) {
        const valueA = asJS(a.value, a.datatype.value)
        const valueB = asJS(b.value, b.datatype.value)
        // use Moment.js isSame function to compare two dates
        return valueA.isSame(valueB)
      }
      return a.value === b.value && a.datatype.value === b.datatype.value && a.language === b.language
    }
    return a.value === b.value
  }

  /**
   * @deprecated
   * Create a RDF triple in Object representation
   * @param  {string} subj - Triple's subject
   * @param  {string} pred - Triple's predicate
   * @param  {string} obj  - Triple's object
   * @return A RDF triple in Object representation
   */
  // export function triple (subj: string, pred: string, obj: string): Algebra.Triple {
  //   return {
  //     subject: subj,
  //     predicate: pred,
  //     object: obj
  //   }
  // }

  /**
   * Count the number of variables in a Triple Pattern
   * @param  {Object} triple - Triple Pattern to process
   * @return The number of variables in the Triple Pattern
   */
  export function countVariables (triple: SPARQL.Triple): number {
    let count = 0
    if (isVariable(triple.subject)) {
      count++
    }
    if (!(predicateIsPropertyPath(triple.predicate)) && isVariable(triple.predicate)) {
      count++
    }
    if (isVariable(triple.object)) {
      count++
    }
    return count
  }

  /**
   * Return True if a RDF predicate is a property path
   * @param predicate Predicate to test
   * @returns True if the predicate is a property path, False otherwise
   */
  export function predicateIsPropertyPath (predicate: SPARQL.Term | SPARQL.PropertyPath): predicate is SPARQL.PropertyPath {
    return 'termType' in predicate
  }

  /**
   * Return True if a RDF term is a SPARQL variable
   * @param term - Term to test
   * @return True if the RDF Term is a SPARQL Variable, False otherwise
   */
  export function isVariable (term: Term | SPARQL.Term): term is Variable {
    return term.termType === 'Variable'
  }

  /**
   * Return True if a RDF Term is a RDF Literal
   * @param term - Term to test
   * @return True if the RDF Term is a RDF Literal, False otherwise
   */
  export function isLiteral (term: Term | SPARQL.Term): term is Literal {
    return term.termType === 'Literal'
  }

  /**
   * Return True if a RDF Term is a RDF IRI/URI
   * @param term - Term to test
   * @return True if the RDF Term is a RDF IRI/URI, False otherwise
   */
  export function isIRI (term: Term | SPARQL.Term): term is NamedNode {
    return term.termType === 'NamedNode'
  }

  /**
   * Return True if a RDF Term is a Blank node
   * @param term - Term to test
   * @return True if the RDF Term is a Blank node, False otherwise
   */
  export function isBlankNode (term: Term | SPARQL.Term): term is BlankNode {
    return term.termType === 'BlankNode'
  }

  /**
   * Hash Triple (pattern) to assign it an unique ID
   * @param triple - Triple (pattern) to hash
   * @return An unique ID to identify the Triple (pattern)
   */
  export function hashTriple (triple: SPARQL.Triple): string {
    const s = termToString(triple.subject)
    const o = termToString(triple.object)
    let p = ''
    if (predicateIsPropertyPath(triple.predicate)) {
      p = JSON.stringify(triple.predicate)
    } else {
      p = termToString(triple.predicate)
    }
    return `s=${s}&p=${p}&o=${o}`
  }

  /**
   * Create an IRI under the XSD namespace
   * (<http://www.w3.org/2001/XMLSchema#>)
   * @param suffix - Suffix appended to the XSD namespace to create an IRI
   * @return An new IRI, under the XSD namespac
   */
  export function XSD (suffix: string): string {
    return `http://www.w3.org/2001/XMLSchema#${suffix}`
  }

  /**
   * Create an IRI under the RDF namespace
   * (<http://www.w3.org/1999/02/22-rdf-syntax-ns#>)
   * @param suffix - Suffix appended to the RDF namespace to create an IRI
   * @return An new IRI, under the RDF namespac
   */
  export function RDF (suffix: string): string {
    return `http://www.w3.org/1999/02/22-rdf-syntax-ns#${suffix}`
  }

  /**
   * Create an IRI under the SEF namespace
   * (<https://callidon.github.io/sparql-engine/functions#>)
   * @param suffix - Suffix appended to the SES namespace to create an IRI
   * @return An new IRI, under the SES namespac
   */
  export function SEF (suffix: string): string {
    return `https://callidon.github.io/sparql-engine/functions#${suffix}`
  }

  /**
   * Create an IRI under the SES namespace
   * (<https://callidon.github.io/sparql-engine/search#>)
   * @param suffix - Suffix appended to the SES namespace to create an IRI
   * @return An new IRI, under the SES namespac
   */
  export function SES (suffix: string): string {
    return `https://callidon.github.io/sparql-engine/search#${suffix}`
  }
}

/**
 * SPARQL related utilities
 */
export namespace sparql {
  /**
   * Hash Basic Graph pattern to assign them an unique ID
   * @param bgp - Basic Graph Pattern to hash
   * @param md5 - True if the ID should be hashed to md5, False to keep it as a plain text string
   * @return An unique ID to identify the BGP
   */
  export function hashBGP (bgp: SPARQL.BgpPattern, md5: boolean = false): string {
    const hashedBGP = bgp.triples.map(rdf.hashTriple).join(';')
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
  export function variablesFromPattern (pattern: SPARQL.Triple): string[] {
    const res: string[] = []
    if (rdf.isVariable(pattern.subject)) {
      res.push(pattern.subject.value)
    }
    if ((!rdf.predicateIsPropertyPath(pattern.predicate)) && rdf.isVariable(pattern.predicate)) {
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
  export function leftLinearJoinOrdering (patterns: SPARQL.Triple[]): SPARQL.Triple[] {
    const results: SPARQL.Triple[] = []
    const x = new Set()
    if (patterns.length > 0) {
      // sort pattern by join predicate
      let p = patterns.shift()!
      let variables = variablesFromPattern(p)
      results.push(p)
      while (patterns.length > 0) {
        // find the next pattern with a common join predicate
        let index = patterns.findIndex(pattern => {
          if (rdf.predicateIsPropertyPath(pattern.predicate)) {
            return includes(variables, pattern.subject.value) || includes(variables, pattern.object.value)
          }
          return includes(variables, pattern.subject.value) || includes(variables, pattern.predicate.value) || includes(variables, pattern.object.value)
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
 * Utilities related to SPARQL query evaluation
 * @author Thomas Minier
 */
export namespace evaluation {
  /**
   * Evaluate a Basic Graph pattern on a RDF graph using a cache
   * @param bgp - Basic Graph pattern to evaluate
   * @param graph - RDF graph
   * @param cache - Cache used
   * @return A pipeline stage that produces the evaluation results
   */
  export function cacheEvalBGP (patterns: SPARQL.Triple[], graph: Graph, cache: BGPCache, builder: BGPStageBuilder, context: ExecutionContext): PipelineStage<Bindings> {
    const bgp = {
      patterns,
      graphIRI: graph.iri.value
    }
    const [subsetBGP, missingBGP] = cache.findSubset(bgp)
    // case 1: no subset of the BGP are in cache => classic evaluation (most frequent)
    if (subsetBGP.length === 0) {
      // we cannot cache the BGP if the query has a LIMIT and/or OFFSET modiifier
      // otherwise we will cache incomplete results. So, we just evaluate the BGP
      if (context.hasProperty(ContextSymbols.HAS_LIMIT_OFFSET) && context.getProperty(ContextSymbols.HAS_LIMIT_OFFSET)) {
        return graph.evalBGP(patterns, context)
      }
      // generate an unique writer ID
      const writerID = uuid()
      // evaluate the BGP while saving all solutions into the cache
      const iterator = Pipeline.getInstance().tap(graph.evalBGP(patterns, context), b => {
        cache.update(bgp, b, writerID)
      })
      // commit the cache entry when the BGP evaluation is done
      return Pipeline.getInstance().finalize(iterator, () => {
        cache.commit(bgp, writerID)
      })
    }
    // case 2: no missing patterns => the complete BGP is in the cache
    if (missingBGP.length === 0) {
      return cache.getAsPipeline(bgp, () => graph.evalBGP(patterns, context))
    }
    const cachedBGP = {
      patterns: subsetBGP,
      graphIRI: graph.iri.value
    }
    // case 3: evaluate the subset BGP using the cache, then join with the missing patterns
    const iterator = cache.getAsPipeline(cachedBGP, () => graph.evalBGP(subsetBGP, context))
    return builder.execute(iterator, missingBGP, context)
  }
}

/**
 * Bound a triple pattern using a set of bindings, i.e., substitute variables in the triple pattern
 * using the set of bindings provided
 * @param triple  - Triple pattern
 * @param bindings - Set of bindings
 * @return An new, bounded triple pattern
 */
export function applyBindings (triple: SPARQL.Triple, bindings: Bindings): SPARQL.Triple {
  const newTriple = Object.assign({}, triple)
  if (rdf.isVariable(triple.subject) && bindings.has(triple.subject)) {
    newTriple.subject = bindings.get(triple.subject)! as any
  }
  if (!rdf.predicateIsPropertyPath(triple.predicate) && rdf.isVariable(triple.predicate) && bindings.has(triple.predicate)) {
    newTriple.predicate = bindings.get(triple.predicate)! as any
  }
  if (rdf.isVariable(triple.object) && bindings.has(triple.object)) {
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
export function deepApplyBindings (group: SPARQL.Pattern, bindings: Bindings): SPARQL.Pattern | SPARQL.SelectQuery {
  switch (group.type) {
    case 'bgp':
      // WARNING property paths are not supported here
      const triples = (group as SPARQL.BgpPattern).triples
      return {
        type: 'bgp',
        triples: triples.map(t => bindings.bound(t))
      }
    case 'group':
    case 'optional':
    case 'union':
      return {
        type: group.type,
        patterns: (group as SPARQL.GroupPattern).patterns.map(g => deepApplyBindings(g, bindings))
      }
    case 'service':
      const serviceGroup = group as SPARQL.ServicePattern
      return {
        type: serviceGroup.type,
        silent: serviceGroup.silent,
        name: serviceGroup.name,
        patterns: serviceGroup.patterns.map(g => deepApplyBindings(g, bindings))
      }
    case 'query':
      let subQuery = (group as SPARQL.SelectQuery)
      subQuery.where = subQuery.where!.map(g => deepApplyBindings(g, bindings))
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
