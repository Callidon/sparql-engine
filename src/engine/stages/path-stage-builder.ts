/* file : path-stage-builder.ts
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

import StageBuilder from './stage-builder'
import { Pipeline } from '../pipeline/pipeline'
import { PipelineStage } from '../pipeline/pipeline-engine'
import { Algebra } from 'sparqljs'
import { Bindings, BindingBase } from '../../rdf/bindings'
import Graph from '../../rdf/graph'
import ExecutionContext from '../context/execution-context'
import { rdf } from '../../utils'

/**
 * A fork of Bindings#bound specialized for triple patterns with property paths
 * @private
 * @param  triple   - A triple pattern with a property path
 * @param  bindings - Set of bindings used to bound the triple
 * @return The bounded triple pattern
 */
function boundPathTriple (triple: Algebra.PathTripleObject, bindings: Bindings): Algebra.PathTripleObject {
  const t = {
    subject: triple.subject,
    predicate: triple.predicate,
    object: triple.object
  }
  if (triple.subject.startsWith('?') && bindings.has(triple.subject)) {
    t.subject = bindings.get(triple.subject)!
  }
  if (triple.object.startsWith('?') && bindings.has(triple.object)) {
    t.object = bindings.get(triple.subject)!
  }
  return t
}

/**
 * The base class to implements to evaluate Property Paths.
 * A subclass of this class only has to implement the `_executePropertyPath` method to provide an execution logic for property paths.
 * @abstract
 * @author Thomas Minier
 */
export default abstract class PathStageBuilder extends StageBuilder {
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
   * Get a {@link PipelineStage} for evaluating a succession of property paths, connected by joins.
   * @param source - Input {@link PipelineStage}
   * @param  triples - Triple patterns
   * @param  context - Execution context
   * @return A {@link PipelineStage} which yield set of bindings from the pipeline of joins
   */
  execute (source: PipelineStage<Bindings>, triples: Algebra.PathTripleObject[], context: ExecutionContext): PipelineStage<Bindings> {
    // create a join pipeline between all property paths using an index join
    const engine = Pipeline.getInstance()
    return triples.reduce((iter: PipelineStage<Bindings>, triple: Algebra.PathTripleObject) => {
      return engine.mergeMap(iter, bindings => {
        const { subject, predicate, object } = boundPathTriple(triple, bindings)
        return engine.map(this._buildIterator(subject, predicate, object, context), (b: Bindings) => bindings.union(b))
      })
    }, source)
  }

  /**
   * Get a {@link PipelineStage} for evaluating the property path.
   * @param  subject - Path subject
   * @param  path  - Property path
   * @param  obj   - Path object
   * @param  context - Execution context
   * @return A {@link PipelineStage} which yield set of bindings
   */
  _buildIterator (subject: string, path: Algebra.PropertyPath, obj: string, context: ExecutionContext): PipelineStage<Bindings> {
    const graph = (context.defaultGraphs.length > 0) ? this._getGraph(context.defaultGraphs) : this._dataset.getDefaultGraph()
    const evaluator = this._executePropertyPath(subject, path, obj, graph, context)
    return Pipeline.getInstance().map(evaluator, (triple: Algebra.TripleObject) => {
      const temp = new BindingBase()
      if (rdf.isVariable(subject)) {
        temp.set(subject, triple.subject)
      }
      if (rdf.isVariable(obj)) {
        temp.set(obj, triple.object)
      }
      // TODO: change the function's behavior for ask queries when subject and object are given
      if (!rdf.isVariable(subject) && !rdf.isVariable(obj)) {
        temp.set('?ask_s', triple.subject)
        temp.set('?ask_v', triple.object)
      }
      return temp
    })
  }

  /**
   * Execute a property path against a RDF Graph.
   * @param  subject - Path subject
   * @param  path  - Property path
   * @param  obj   - Path object
   * @param  graph - RDF graph
   * @param  context - Execution context
   * @return A {@link PipelineStage} which yield RDF triples matching the property path
   */
  abstract _executePropertyPath (subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject>
}
