/* file : graph-executor.ts
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
import { Observable, merge } from 'rxjs'
import { map, shareReplay } from 'rxjs/operators'
import { rdf } from '../../utils'
import { Algebra } from 'sparqljs'
import Dataset from '../../rdf/dataset'
import { Bindings } from '../../rdf/bindings'
import ExecutionContext from '../context/execution-context'

/**
 * A GraphExecutor is responsible for evaluation a GRAPH clause in a SPARQL query.
 * @author Thomas Minier
 */
export default class GraphExecutor extends Executor {
  private readonly _dataset: Dataset

  /**
   * Constructor
   * @param dataset - RDF Dataset used during query execution
   */
  constructor (dataset: Dataset) {
    super()
    this._dataset = dataset
  }

  /**
   * Build an iterator to evaluate a GRAPH clause
   * @param  source  - Source iterator
   * @param  node    - Graph clause
   * @param  options - Execution options
   * @return An iterator used to evaluate a GRAPH clause
   */
  buildIterator (source: Observable<Bindings>, node: Algebra.GraphNode, context: ExecutionContext): Observable<Bindings> {
    let subquery: Algebra.RootNode
    if (node.patterns[0].type === 'query') {
      subquery = (<Algebra.RootNode> node.patterns[0])
    } else {
      subquery = {
        prefixes: context.getProperty('prefixes'),
        queryType: 'SELECT',
        variables: ['*'],
        type: 'query',
        where: node.patterns
      }
    }
    // handle the case where the GRAPh IRI is a SPARQL variable
    if (rdf.isVariable(node.name) && context.namedGraphs.length > 0) {
      // clone the source first
      source = source.pipe(shareReplay(5))
      // execute the subquery using each graph, and bound the graph var to the graph iri
      const iterators = context.namedGraphs.map((iri: string) => {
        return this._execute(source, iri, subquery, context).pipe(map(b => {
          return b.extendMany([[node.name, iri]])
        }))
      })
      return merge(...iterators)
    }
    // otherwise, execute the subquery using the Graph
    return this._execute(source, node.name, subquery, context)
  }

  /**
   * Returns an iterator used to evaluate a GRAPH clause
   * @param  source    - Source iterator
   * @param  iri       - IRI of the GRAPH clause
   * @param  subquery  - Subquery to be evaluated
   * @param  options   - Execution options
   * @return An iterator used to evaluate a GRAPH clause
   */
  _execute (source: Observable<Bindings>, iri: string, subquery: Algebra.RootNode, context: ExecutionContext): Observable<Bindings> {
    const opts = context.clone()
    opts.defaultGraphs = [ iri ]
    return this._builder!._buildQueryPlan(subquery, opts, source)
  }
}
