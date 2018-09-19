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

import { AsyncIterator, ClonedIterator, MultiTransformIterator, SingletonIterator } from 'asynciterator'
import { some } from 'lodash'
import { Algebra } from 'sparqljs'
import Graph from '../../rdf/graph'
import Dataset from '../../rdf/dataset'
import { Bindings } from '../../rdf/bindings'

/**
 * Basic iterator used to evaluate Basic graph patterns using the "evalBGP" method
 * available
 * @extends MultiTransformIterator
 */
class BaseBGPIterator extends MultiTransformIterator<Bindings,Bindings> {
  readonly _bgp: Algebra.TripleObject[]
  readonly _graph: Graph
  readonly _options: Object

  constructor (source: AsyncIterator<Bindings>, bgp: Algebra.TripleObject[], graph: Graph, options: Object) {
    super(source, options)
    this._bgp = bgp
    this._graph = graph
    this._options = options
  }

  _createTransformer (bindings: Bindings): AsyncIterator<Bindings> {
    // bound the BGP using incoming bindings, then delegate execution to the dataset
    let boundedBGP = this._bgp.map(t => bindings.bound(t))
    const hasVars = boundedBGP.map(p => some(p, v => v!.startsWith('?')))
      .reduce((acc, v) => acc && v, true)
    return this._graph.evalBGP(boundedBGP, this._options)
      .map((item: Bindings) => {
        if (item.size === 0 && hasVars) return null
        return item.union(bindings)
      })
  }
}

/**
 * A BGPExecutor is responsible for evaluation BGP in a SPARQL query.
 * Users can extend this class and overrides the "_execute" method to customize BGP evaluation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default  class BGPExecutor {
  readonly _dataset: Dataset

  constructor (dataset: Dataset) {
    this._dataset = dataset
  }

  /**
   * Returns True if the input iterator if the starting iterator in a pipeline
   * @private
   * @param  {AsyncIterator} source - Source Iterator
   * @return {Boolean} True if the input iterator if the starting iterator in a pipeline, False otherwise
   */
  _isJoinIdentity (source: AsyncIterator<Bindings>): boolean {
    let isJoinIdentity = false
    let typeFound = false
    let tested = source
    while (!typeFound) {
      if (tested instanceof ClonedIterator) {
        if (tested._source != null) {
          tested = tested._source
        } else {
          isJoinIdentity = true
          typeFound = true
        }
      } else if (tested instanceof SingletonIterator) {
        isJoinIdentity = true
        typeFound = true
      } else {
        typeFound = true
      }
    }
    return isJoinIdentity
  }

  /**
   * Return the RDF Graph to be used for BGP evaluation.
   * * If `iris` is empty, returns the default graph
   * * If `iris` has a single entry, returns the corresponding named graph
   * * Otherwise, returns an UnionGraph based on the provided iris
   * @param  {string[]} iris - List of Graph's iris
   * @return {Graph} A RDF Graph
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
   * @private
   * @param  {AsyncIterator}  source    - Source iterator
   * @param  {Algebra.TripleObject[]}       patterns  - Set of triple patterns
   * @param  {*}         options   - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a Basic Graph pattern
   */
  buildIterator (source: AsyncIterator<Bindings>, patterns: Algebra.TripleObject[], options: any): AsyncIterator<Bindings> {
    // select the graph to use for BGP evaluation
    const graph = ('_from' in options) ? this._getGraph(options._from.default) : this._dataset.getDefaultGraph()
    // rewrite a BGP to remove blank node addedd by the Turtle notation
    const [bgp, artificals] = this._replaceBlankNodes(patterns)
    let iterator = this._execute(source, graph, bgp, options, this._isJoinIdentity(source))
    if (artificals.length > 0) {
      iterator = iterator.map(b => b.filter(variable => artificals.indexOf(variable) < 0))
    }
    return iterator
  }

  /**
   * Replace the blank nodes in a BGP by SPARQL variables
   * @param  {Object[]} patterns - BGP to rewrite, i.e., a set of triple patterns
   * @return {Array} A Tuple [Rewritten BGP, List of SPARQL variable added]
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
   * @param  {AsyncIterator}  source         - Source iterator
   * @param  {Graph}          graph          - The graph on which the BGP should be executed
   * @param  {Object[]}       patterns       - Set of triple patterns
   * @param  {Object}         options        - Execution options
   * @param  {Boolean}        isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
   * @return {AsyncIterator} An iterator used to evaluate a Basic Graph pattern
   */
  _execute (source: AsyncIterator<Bindings>, graph: Graph, patterns: Algebra.TripleObject[], options: Object, isJoinIdentity: boolean): AsyncIterator<Bindings> {
    return new BaseBGPIterator(source, patterns, graph, options)
  }
}
