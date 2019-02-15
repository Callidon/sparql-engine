/* file : bgp-executor.ts
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

import Executor from './executor'
import { Observable, from } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
// import { some } from 'lodash'
import { Algebra } from 'sparqljs'
import Graph from '../../rdf/graph'
import Dataset from '../../rdf/dataset'
import { Bindings } from '../../rdf/bindings'
import { GRAPH_CAPABILITY } from '../../rdf/graph_capability'
import { parseHints } from '../context/query-hints'
import ExecutionContext from '../context/execution-context'

import boundJoin from '../../operators/join/bound-join'

/**
 * Basic iterator used to evaluate Basic graph patterns using the "evalBGP" method
 * available
 * @private
 */
 function bgpEvaluation (bgp: Algebra.TripleObject[], graph: Graph, context: ExecutionContext) {
   return mergeMap((bindings: Bindings) => {
     let boundedBGP = bgp.map(t => bindings.bound(t))
     // const hasVars = boundedBGP.map(p => some(p, v => v!.startsWith('?')))
     //   .reduce((acc, v) => acc && v, true)
     return from(graph.evalBGP(boundedBGP, context))
       .pipe(map((item: Bindings) => {
         // if (item.size === 0 && hasVars) return null
         return item.union(bindings)
       }))
   })
 }

/**
 * A BGPExecutor is responsible for evaluation BGP in a SPARQL query.
 * Users can extend this class and overrides the "_execute" method to customize BGP evaluation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class BGPExecutor extends Executor {
  readonly _dataset: Dataset

  /**
   * Constructor
   * @param dataset - RDF Dataset used during query execution
   */
  constructor (dataset: Dataset) {
    super()
    this._dataset = dataset
  }

  /**
   * Return the RDF Graph to be used for BGP evaluation.
   * * If `iris` is empty, returns the default graph
   * * If `iris` has a single entry, returns the corresponding named graph
   * * Otherwise, returns an UnionGraph based on the provided iris
   * @param  iris - List of Graph's iris
   * @return An RDF Graph
   */
  _getGraph (iris: string[]): Graph {
    if (iris.length === 0) {
      return this._dataset.getDefaultGraph()
    } else if (iris.length === 1) {
      return this._dataset.getNamedGraph(iris[0])
    }
    return this._dataset.getUnionGraph(iris)
  }

  /**
   * Build an iterator to evaluate a BGP
   * @param  source    - Source iterator
   * @param  patterns  - Set of triple patterns
   * @param  options   - Execution options
   * @return An iterator used to evaluate a Basic Graph pattern
   */
  buildIterator (source: Observable<Bindings>, patterns: Algebra.TripleObject[], context: ExecutionContext): Observable<Bindings> {
    // select the graph to use for BGP evaluation
    const graph = (context.defaultGraphs.length > 0) ? this._getGraph(context.defaultGraphs) : this._dataset.getDefaultGraph()
    // extract eventual query hints from the BGP & merge them into the context
    let extraction = parseHints(patterns, context.hints)
    context.hints = extraction[1]
    // rewrite a BGP to remove blank node addedd by the Turtle notation
    const [bgp, artificals] = this._replaceBlankNodes(extraction[0])
    let iterator = this._execute(source, graph, bgp, context)
    if (artificals.length > 0) {
      iterator = iterator.pipe(map(b => b.filter(variable => artificals.indexOf(variable) < 0)))
    }
    return iterator
  }

  /**
   * Replace the blank nodes in a BGP by SPARQL variables
   * @param patterns - BGP to rewrite, i.e., a set of triple patterns
   * @return A Tuple [Rewritten BGP, List of SPARQL variable added]
   */
  _replaceBlankNodes (patterns: Algebra.TripleObject[]): [Algebra.TripleObject[], string[]] {
    const newVariables: string[] = []
    function rewrite (term: string): string {
      let res = term
      if (term.startsWith('_:')) {
        res = '?' + term.slice(2)
        if (newVariables.indexOf(res) < 0) {
          newVariables.push(res)
        }
      }
      return res
    }
    const newBGP = patterns.map(p => {
      return {
        subject: rewrite(p.subject),
        predicate: rewrite(p.predicate),
        object: rewrite(p.object)
      }
    })
    return [newBGP, newVariables]
  }

  /**
   * Returns an iterator used to evaluate a Basic Graph pattern
   * @param  source         - Source iterator
   * @param  graph          - The graph on which the BGP should be executed
   * @param  patterns       - Set of triple patterns
   * @param  options        - Execution options
   * @param  isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
   * @return An iterator used to evaluate a Basic Graph pattern
   */
  _execute (source: Observable<Bindings>, graph: Graph, patterns: Algebra.TripleObject[], context: ExecutionContext): Observable<Bindings> {
    if (graph._isCapable(GRAPH_CAPABILITY.UNION)) {
      return boundJoin(source, patterns, graph, context)
    }
    return source.pipe(bgpEvaluation(patterns, graph, context))
  }
}
