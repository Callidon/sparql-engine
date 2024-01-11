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

import * as SPARQL from 'sparqljs'
import { Binding, BindingBase, Bindings } from '../../rdf/bindings.js'
import Graph from '../../rdf/graph.js'
import { rdf, sparql } from '../../utils.js'
import ExecutionContext from '../context/execution-context.js'
import { PipelineStage } from '../pipeline/pipeline-engine.js'
import { Pipeline } from '../pipeline/pipeline.js'
import StageBuilder from './stage-builder.js'

/**
 * A fork of Bindings#bound specialized for triple patterns with property paths
 * @private
 * @param  triple   - A triple pattern with a property path
 * @param  bindings - Set of bindings used to bound the triple
 * @return The bounded triple pattern
 */
function boundPathTriple(triple: sparql.PropertyPathTriple, bindings: Bindings): sparql.PropertyPathTriple {
  const t: sparql.PropertyPathTriple = {
    subject: triple.subject,
    predicate: triple.predicate,
    object: triple.object
  }
  if (rdf.isVariable(triple.subject) && bindings.has(triple.subject)) {
    t.subject = bindings.get(triple.subject)! as sparql.PropertyPathTriple['subject']
  }
  if (rdf.isVariable(triple.object) && bindings.has(triple.object)) {
    t.object = bindings.get(triple.object)!
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
  _getGraph(iris: rdf.NamedNode[]): Graph {
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
  execute(source: PipelineStage<Bindings>, triples: sparql.PropertyPathTriple[], context: ExecutionContext): PipelineStage<Bindings> {
    // create a join pipeline between all property paths using an index join
    const engine = Pipeline.getInstance()
    return triples.reduce((iter: PipelineStage<Bindings>, triple: sparql.PropertyPathTriple) => {
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
  _buildIterator(subject: sparql.PropertyPathTriple['subject'], path: sparql.PropertyPathTriple['predicate'], obj: sparql.PropertyPathTriple['object'], context: ExecutionContext): PipelineStage<Bindings> {
    const graph = (context.defaultGraphs.length > 0) ? this._getGraph(context.defaultGraphs as rdf.NamedNode[]) : this._dataset.getDefaultGraph()
    const evaluator = this._executePropertyPath(subject, path, obj, graph, context)
    return Pipeline.getInstance().map(evaluator, (triple: sparql.Triple) => {
      const temp = new BindingBase()
      if (rdf.isVariable(subject)) {
        temp.set(subject, triple.subject as Binding)
      }
      if (rdf.isVariable(obj)) {
        temp.set(obj, triple.object as Binding)
      }
      // TODO: change the function's behavior for ask queries when subject and object are given
      if (!rdf.isVariable(subject) && !rdf.isVariable(obj)) {
        temp.set(rdf.createVariable('?ask_s'), triple.subject as Binding)
        temp.set(rdf.createVariable('?ask_v'), triple.object as Binding)
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
  abstract _executePropertyPath(subject: sparql.PropertyPathTriple['subject'], path: sparql.PropertyPathTriple['predicate'], obj: sparql.PropertyPathTriple['object'], graph: Graph, context: ExecutionContext): PipelineStage<SPARQL.Triple>
}
