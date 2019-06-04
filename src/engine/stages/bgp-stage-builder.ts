/* file : bgp-stage-builder.ts
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

import StageBuilder from './stage-builder'
import { Pipeline } from '../pipeline/pipeline'
import { PipelineStage } from '../pipeline/pipeline-engine'
// import { some } from 'lodash'
import { Algebra } from 'sparqljs'
import Graph from '../../rdf/graph'
import { Bindings } from '../../rdf/bindings'
// import { GRAPH_CAPABILITY } from '../../rdf/graph_capability'
import { parseHints } from '../context/query-hints'
import ExecutionContext from '../context/execution-context'

// import boundJoin from '../../operators/join/bound-join'

/**
 * Basic {@link PipelineStage} used to evaluate Basic graph patterns using the "evalBGP" method
 * available
 * @private
 */
 function bgpEvaluation (source: PipelineStage<Bindings>, bgp: Algebra.TripleObject[], graph: Graph, context: ExecutionContext) {
   const engine = Pipeline.getInstance()
   return engine.mergeMap(source, (bindings: Bindings) => {
     let boundedBGP = bgp.map(t => bindings.bound(t))
     // const hasVars = boundedBGP.map(p => some(p, v => v!.startsWith('?')))
     //   .reduce((acc, v) => acc && v, true)
     return engine.map(graph.evalBGP(boundedBGP, context), (item: Bindings) => {
       // if (item.size === 0 && hasVars) return null
       return item.union(bindings)
     })
   })
 }

/**
 * A BGPStageBuilder evaluates Basic Graph Patterns in a SPARQL query.
 * Users can extend this class and overrides the "_buildIterator" method to customize BGP evaluation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class BGPStageBuilder extends StageBuilder {
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
      return this.dataset.getDefaultGraph()
    } else if (iris.length === 1) {
      return this.dataset.getNamedGraph(iris[0])
    }
    return this.dataset.getUnionGraph(iris)
  }

  /**
   * Build a {@link PipelineStage} to evaluate a BGP
   * @param  source    - Input {@link PipelineStage}
   * @param  patterns  - Set of triple patterns
   * @param  options   - Execution options
   * @return A {@link PipelineStage} used to evaluate a Basic Graph pattern
   */
  execute (source: PipelineStage<Bindings>, patterns: Algebra.TripleObject[], context: ExecutionContext): PipelineStage<Bindings> {
    // avoids sending a request with an empty array
    if(patterns.length == 0) return source
    // select the graph to use for BGP evaluation
    const graph = (context.defaultGraphs.length > 0) ? this._getGraph(context.defaultGraphs) : this.dataset.getDefaultGraph()
    // extract eventual query hints from the BGP & merge them into the context
    let extraction = parseHints(patterns, context.hints)
    context.hints = extraction[1]
    // rewrite a BGP to remove blank node addedd by the Turtle notation
    const [bgp, artificals] = this._replaceBlankNodes(extraction[0])
    let iterator = this._buildIterator(source, graph, bgp, context)
    if (artificals.length > 0) {
      iterator = Pipeline.getInstance().map(iterator, (b: Bindings) => b.filter(variable => artificals.indexOf(variable) < 0))
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
   * Returns a {@link PipelineStage} used to evaluate a Basic Graph pattern
   * @param  source         - Input {@link PipelineStage}
   * @param  graph          - The graph on which the BGP should be executed
   * @param  patterns       - Set of triple patterns
   * @param  options        - Execution options
   * @param  isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
   * @return A {@link PipelineStage} used to evaluate a Basic Graph pattern
   */
  _buildIterator (source: PipelineStage<Bindings>, graph: Graph, patterns: Algebra.TripleObject[], context: ExecutionContext): PipelineStage<Bindings> {
    // if (graph._isCapable(GRAPH_CAPABILITY.UNION)) {
    //   return boundJoin(source, patterns, graph, context)
    // }
    return bgpEvaluation(source, patterns, graph, context)
  }
}
