/* file : graph.ts
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

import { Pipeline } from '../engine/pipeline/pipeline'
import { PipelineInput, PipelineStage } from '../engine/pipeline/pipeline-engine'
import { Algebra } from 'sparqljs'
import indexJoin from '../operators/join/index-join'
import { rdf } from '../utils'
import { Bindings, BindingBase } from './bindings'
import { GRAPH_CAPABILITY } from './graph_capability'
import ExecutionContext from '../engine/context/execution-context'

/**
 * Metadata used for query optimization
 */
export interface PatternMetadata {
  triple: Algebra.TripleObject,
  cardinality: number,
  nbVars: number
}

/**
 * Comparator function for sorting triple pattern
 * by ascending cardinality and descending number of variables
 * @private
 * @param  a - Metadata about left triple
 * @param  b - Metadata about right triple
 * @return Comparaison result (-1, 1, 0)
 */
function sortPatterns (a: PatternMetadata, b: PatternMetadata): number {
  if (a.cardinality < b.cardinality) {
    return -1
  } else if (a.cardinality > b.cardinality) {
    return 1
  } else if (a.nbVars > b.nbVars) {
    return -1
  } else if (a.nbVars < b.nbVars) {
    return 1
  }
  return 0
}

function parseCapabilities (registry: Map<GRAPH_CAPABILITY, boolean>, proto: any): void {
  registry.set(GRAPH_CAPABILITY.ESTIMATE_TRIPLE_CARD, proto.estimateCardinality != null)
  registry.set(GRAPH_CAPABILITY.UNION, proto.evalUnion != null)
}

/**
 * An abstract RDF Graph, accessed through a RDF Dataset
 * @abstract
 * @author Thomas Minier
 */
export default abstract class Graph {
  private _iri: string
  private _capabilities: Map<GRAPH_CAPABILITY, boolean>

  constructor () {
    this._iri = ''
    this._capabilities = new Map()
    parseCapabilities(this._capabilities, Object.getPrototypeOf(this))
  }

  /**
   * Get the IRI of the Graph
   * @return The IRI of the Graph
   */
  get iri (): string {
    return this._iri
  }

  /**
   * Set the IRI of the Graph
   * @param value - The new IRI of the Graph
   */
  set iri (value: string) {
    this._iri = value
  }

  /**
   * Test if a graph has a capability
   * @param  token - Capability tested
   * @return True if the graph has the reuqested capability, false otherwise
   */
  _isCapable (token: GRAPH_CAPABILITY): boolean {
    return this._capabilities.has(token) && this._capabilities.get(token)!
  }

  /**
   * Insert a RDF triple into the RDF Graph
   * @param  triple - RDF Triple to insert
   * @return A Promise fulfilled when the insertion has been completed
   */
  abstract insert (triple: Algebra.TripleObject): Promise<void>

  /**
   * Delete a RDF triple from the RDF Graph
   * @param  triple - RDF Triple to delete
   * @return A Promise fulfilled when the deletion has been completed
   */
  abstract delete (triple: Algebra.TripleObject): Promise<void>

  /**
   * Get a {@link PipelineInput} which finds RDF triples matching a triple pattern in the graph.
   * @param  triple - Triple pattern to find
   * @return A {@link PipelineInput} which finds RDF triples matching a triple pattern
   */
  abstract find (triple: Algebra.TripleObject, context: ExecutionContext): PipelineInput<Algebra.TripleObject>

  /**
   * Remove all RDF triples in the Graph
   * @return A Promise fulfilled when the clear operation has been completed
   */
  abstract clear (): Promise<void>

  /**
   * Estimate the cardinality of a Triple pattern, i.e., the number of matching RDF Triples in the RDF Graph.
   * @param  triple - Triple pattern to estimate cardinality
   * @return A Promise fulfilled with the pattern's estimated cardinality
   */
  estimateCardinality (triple: Algebra.TripleObject): Promise<number> {
    throw new SyntaxError('Error: this graph is not capable of estimating the cardinality of a triple pattern')
  }

  /**
   * Evaluates an union of Basic Graph patterns on the Graph using a {@link PipelineStage}.
   * @param  patterns - The set of BGPs to evaluate
   * @param  options - Execution options
   * @return A {@link PipelineStage} which evaluates the Basic Graph pattern on the Graph
   */
  evalUnion (patterns: Algebra.TripleObject[][], context: ExecutionContext): PipelineStage<Bindings> {
    throw new SyntaxError('Error: this graph is not capable of evaluating UNION queries')
  }

  /**
   * Evaluates a Basic Graph pattern, i.e., a set of triple patterns, on the Graph using a {@link PipelineStage}.
   * @param  bgp - The set of triple patterns to evaluate
   * @param  options - Execution options
   * @return A {@link PipelineStage} which evaluates the Basic Graph pattern on the Graph
   */
  evalBGP (bgp: Algebra.TripleObject[], context: ExecutionContext): PipelineStage<Bindings> {
    const engine = Pipeline.getInstance()
    if (this._isCapable(GRAPH_CAPABILITY.ESTIMATE_TRIPLE_CARD)) {
      const op = engine.from(Promise.all(bgp.map(triple => {
        return this.estimateCardinality(triple).then(c => {
          return { triple, cardinality: c, nbVars: rdf.countVariables(triple) }
        })
      })))
      return engine.mergeMap(op, (results: PatternMetadata[]) => {
        results.sort(sortPatterns)
        const start = engine.of(new BindingBase())
        return results.reduce((iter: PipelineStage<Bindings>, v: PatternMetadata) => {
          return indexJoin(iter, v.triple, this, context)
        }, start)
      })
    } else {
      // FIX ME: this trick is required, otherwise ADD, COPY and MOVE queries are not evaluated correctly. We need to find why...
      return engine.mergeMap(engine.from(Promise.resolve(null)), () => {
        const start = engine.of(new BindingBase())
        return bgp.reduce((iter: PipelineStage<Bindings>, t: Algebra.TripleObject) => {
          return indexJoin(iter, t, this, context)
        }, start)
      })
    }
  }
}

// disable optional methods
Object.defineProperty(Graph.prototype, 'estimateCardinality', {value: null})
Object.defineProperty(Graph.prototype, 'evalUnion', {value: null})
