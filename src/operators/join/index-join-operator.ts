/* file : triple-operator.ts
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

import { AsyncIterator, MultiTransformIterator } from 'asynciterator'
import Graph from '../../rdf/graph'
import { Bindings, BindingBase } from '../../rdf/bindings'
import { Algebra } from 'sparqljs'
import { rdf } from '../../utils'
import { mapKeys, pickBy, some, size } from 'lodash'

/**
 * Perform a join between a source of solution bindings (left relation)
 * and a triple pattern (right relation) using the Index Nested Loop Join algorithm.
 * This algorithm is more efficient if the cardinality of the left relation is smaller
 * than the cardinality of the right one.
 * @extends MultiTransformIterator
 * @author Thomas Minier
 */
export default class IndexJoinOperator extends MultiTransformIterator<Bindings,Bindings> {
  private readonly _pattern: Algebra.TripleObject
  private readonly _graph: Graph
  private readonly _options: Object

  /**
   * Constructor
   * @param {AsyncIterator} source  - Source iterator (left relation)
   * @param {Object}        pattern - Triple pattern to join with (right relation)
   * @param {Graph}         graph   - RDF Graph on which the join is performed
   * @param {Object}        options - Execution options
   */
  constructor (source: AsyncIterator<Bindings>, pattern: Algebra.TripleObject, graph: Graph, options: Object) {
    super(source, options)
    this._pattern = pattern
    this._graph = graph
    this._options = options
  }

  _createTransformer (bindings: Bindings): AsyncIterator<Bindings> {
    const boundedPattern = bindings.bound(this._pattern)
    const hasVars = some(boundedPattern, (v: any) => v.startsWith('?'))
    return this._graph.find(boundedPattern, this._options)
      .map<Bindings>((item: Algebra.TripleObject) => {
        let temp = pickBy(item, (v, k) => {
          return rdf.isVariable(boundedPattern[k])
        })
        temp = mapKeys(temp, (v, k) => {
          return boundedPattern[k]
        })
        if (size(temp) === 0 && hasVars) return null
        return BindingBase.fromObject(temp).union(bindings)
      })
  }
}
