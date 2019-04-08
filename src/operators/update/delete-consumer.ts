/* file : insert-consumer.ts
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

import { Consumer } from './consumer'
import Graph from '../../rdf/graph'
import { PipelineStage } from '../../engine/pipeline/pipeline-engine'
import { Algebra } from 'sparqljs'

/**
 * A DeleteConsumer evaluates a SPARQL DELETE clause
 * @extends Consumer
 * @author Thomas Minier
 */
export default class DeleteConsumer extends Consumer {
  private readonly _graph: Graph

  /**
   * Constructor
   * @param source - Input {@link PipelineStage}
   * @param graph - Input RDF Graph
   * @param options - Execution options
   */
  constructor (source: PipelineStage<Algebra.TripleObject>, graph: Graph, options: Object) {
    super(source, options)
    this._graph = graph
  }

  _write (triple: Algebra.TripleObject, encoding: string | undefined, done: (err?: Error) => void): void {
    this._graph.delete(triple)
      .then(() => done())
      .catch(err => {
        this.emit('error', err)
        done(err)
      })
  }
}
