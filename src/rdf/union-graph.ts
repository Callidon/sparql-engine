/* file : union-graph.ts
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

import Graph from './graph'
import { PipelineInput } from '../engine/pipeline/pipeline-engine'
import { Pipeline } from '../engine/pipeline/pipeline'
import { Algebra } from 'sparqljs'
import ExecutionContext from '../engine/context/execution-context'

/**
 * An UnionGraph represents the dynamic union of several graphs.
 * Addition only affects the left-most operand, deletion affects all graphs.
 * Searching for RDF triple smatching a triple pattern in such Graph is equivalent
 * as the Union of matching RDF triples in all graphs.
 * @extends Graph
 * @author Thomas Minier
 */
export default class UnionGraph extends Graph {
  private readonly _graphs: Graph[]

  /**
   * Constructor
   * @param graphs - Set of RDF graphs
   */
  constructor (graphs: Graph[]) {
    super()
    this.iri = graphs.map(g => g.iri).join('+')
    this._graphs = graphs
  }

  insert (triple: Algebra.TripleObject): Promise<void> {
    return this._graphs[0].insert(triple)
  }

  delete (triple: Algebra.TripleObject): Promise<void> {
    return this._graphs.reduce((prev, g) => prev.then(() => g.delete(triple)), Promise.resolve())
  }

  find (triple: Algebra.TripleObject, context: ExecutionContext): PipelineInput<Algebra.TripleObject> {
    return Pipeline.getInstance().merge(...this._graphs.map(g => g.find(triple, context)))
  }

  clear (): Promise<void> {
    return this._graphs.reduce((prev, g) => prev.then(() => g.clear()), Promise.resolve())
  }

  estimateCardinality (triple: Algebra.TripleObject): Promise<number> {
    return Promise.all(this._graphs.map(g => g.estimateCardinality(triple)))
      .then((cardinalities: number[]) => {
        return Promise.resolve(cardinalities.reduce((acc, x) => acc + x, 0))
      })
  }
}
