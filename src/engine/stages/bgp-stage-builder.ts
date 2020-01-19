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
import { Bindings, BindingBase } from '../../rdf/bindings'
// import { GRAPH_CAPABILITY } from '../../rdf/graph_capability'
import { parseHints } from '../context/query-hints'
import ExecutionContext from '../context/execution-context'
import { rdf } from '../../utils'

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

    // extract eventual query hints from the BGP & merge them into the context
    let extraction = parseHints(patterns, context.hints)
    context.hints = extraction[1]
    // rewrite a BGP to remove blank node addedd by the Turtle notation
    const [bgp, artificals] = this._replaceBlankNodes(extraction[0])

    // if the graph is a variable, go through each binding and look for its value
    if(context.defaultGraphs.length > 0 && rdf.isVariable(context.defaultGraphs[0])) {
      const engine = Pipeline.getInstance()
      return engine.mergeMap(source, (value: Bindings) => {
        const iri = value.get(context.defaultGraphs[0])

        //if the graph doesn't exist in the dataset, then create one with the createGraph factrory
        const graphs = this.dataset.getAllGraphs().filter(g => g.iri === iri)
        const graph = (graphs.length > 0) ? graphs[0] : (iri !== null) ? this.dataset.createGraph(iri) : null
        if(graph){
          let iterator = this._buildIterator(engine.from([value]), graph, bgp, context)
          if (artificals.length > 0) {
            iterator = engine.map(iterator, (b: Bindings) => b.filter(variable => artificals.indexOf(variable) < 0))
          }
          return iterator
        }
        throw `Cant' find or create the graph ${iri}`
      })
    }

    // select the graph to use for BGP evaluation
    const graph = (context.defaultGraphs.length > 0) ? this._getGraph(context.defaultGraphs) : this.dataset.getDefaultGraph()
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
   * @param  context        - Execution options
   * @return A {@link PipelineStage} used to evaluate a Basic Graph pattern
   */
  _buildIterator (source: PipelineStage<Bindings>, graph: Graph, patterns: Algebra.TripleObject[], context: ExecutionContext): PipelineStage<Bindings> {
    // if (graph._isCapable(GRAPH_CAPABILITY.UNION)) {
    //   return boundJoin(source, patterns, graph, context)
    // }
    return bgpEvaluation(source, patterns, graph, context)
  }

  /**
   * Returns a {@link PipelineStage} used to evaluate a Full Text Search query from a set of magic patterns.
   * @param  source         - Input {@link PipelineStage}
   * @param  graph          - The graph on which the full text search should be executed
   * @param  pattern        - Input triple pattern
   * @param  magicTriples   - Set of magic triple patterns used to configure the full text search
   * @param  context        - Execution options
   * @return A {@link PipelineStage} used to evaluate the Full Text Search query
   */
  _buildFullTextSearchIterator (source: PipelineStage<Bindings>, graph: Graph, pattern: Algebra.TripleObject, magicTriples: Algebra.TripleObject[], context: ExecutionContext): PipelineStage<Bindings> {
    // full text search default parameters
    let queryVariable: string = ''
    let keywords: string[] = []
    let minScore: number | null = null
    let maxScore: number | null = null
    let minRank: number | null = null
    let maxRank: number | null = null
    // flags & variables used to add the score and/or rank to the solutions
    let addScore = false
    let addRank = false
    let scoreVariable = ''
    let rankVariable = ''
    // get the search variable fro the first magic triple
    const magicTriple = magicTriples[0]
    if (magicTriple.subject === pattern.subject) {
      queryVariable = pattern.subject
    } else if (magicTriple.predicate === pattern.predicate) {
      queryVariable = pattern.predicate
    } else if (magicTriple.object === pattern.object) {
      queryVariable = pattern.object
    } else {
      throw new SyntaxError(`Invalid Full Text Search query: no subject/predicate/object of the queried pattern is the subject of the magic triple ${magicTriple}`)
    }
    // compute all other parameters from the set of magic triples
    magicTriples.forEach(triple => {
      // assert that the magic triple is correct
      if (triple.subject !== queryVariable) {
        throw new SyntaxError(`Invalid Full Text Search query: the query variable ${queryVariable} is not the subject of the magic triple ${triple}`)
      }
      // parse the magic triple
      const objectValue = rdf.getLiteralValue(triple.object)
      switch (triple.predicate) {
        // keywords: ?o ses:search “neil gaiman”
        case rdf.SES('search'): {
          keywords = objectValue.split(' ')
          break
        }
        // min relevance score: ?o ses:minRelevance “0.25”
        case rdf.SES('minRelevance'): {
          minScore = Number(objectValue)
          break
        }
        // max relevance score: ?o ses:maxRelevance “0.75”
        case rdf.SES('maxRelevance'): {
          maxScore = Number(objectValue)
          break
        }
        // min rank: ?o ses:minRank "5" .
        case rdf.SES('minRank'): {
          minRank = Number(objectValue)
          break
        }
        // max rank: ?o ses:maxRank “1000” .
        case rdf.SES('maxRank'): {
          maxRank = Number(objectValue)
          break
        }
        // include relevance score: ?o ses:relevance ?score .
        case rdf.SES('relevance'): {
          if (rdf.isVariable(triple.object)) {
            addScore = true
            scoreVariable = triple.object
          } else {
            throw new SyntaxError(`Invalid Full Text Search query: the object of the magic triple ${triple} must be a SPARQL variable.`)
          }
          break
        }
        // include rank: ?o ses:rank ?rank .
        case rdf.SES('rank'): {
          if (rdf.isVariable(triple.object)) {
            addRank = true
            rankVariable = triple.object
          } else {
            throw new SyntaxError(`Invalid Full Text Search query: the object of the magic triple ${triple} must be a SPARQL variable.`)
          }
          break
        }
        // do nothing for unknown magic triples
        default: {
          break
        }
      }
    })
    // join the input bindings with the full text search operation
    return Pipeline.getInstance().mergeMap(source, bindings => {
      let boundedPattern = bindings.bound(pattern)
      // delegate the actual full text search to the RDF graph
      const iterator = graph.fullTextSearch(boundedPattern, queryVariable, keywords, minScore, maxScore, minRank, maxRank, context)
      return Pipeline.getInstance().map(iterator, item => {
        const [triple, score, rank] = item
        // build solutions bindings
        const mu = new BindingBase()
        if (rdf.isVariable(boundedPattern.subject) && !rdf.isVariable(triple.subject)) {
          mu.set(boundedPattern.subject, triple.subject)
        }
        if (rdf.isVariable(boundedPattern.predicate) && !rdf.isVariable(triple.predicate)) {
          mu.set(boundedPattern.predicate, triple.predicate)
        }
        if (rdf.isVariable(boundedPattern.object) && !rdf.isVariable(triple.object)) {
          mu.set(boundedPattern.object, triple.object)
        }
        // add score and rank if required
        if (addScore) {
          mu.set(scoreVariable, `"${score}"^^${rdf.XSD('float')}`)
        }
        if (addRank) {
          mu.set(rankVariable, `"${rank}"^^${rdf.XSD('integer')}`)
        }
        // Merge with input bindings and then return the final results
        return bindings.union(mu)
      })
    })
  }
}
