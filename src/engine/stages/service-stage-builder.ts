/* file : service-stage-builder.ts
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

import StageBuilder from './stage-builder'
import { Algebra } from 'sparqljs'
import { Pipeline } from '../pipeline/pipeline'
import { PipelineStage } from '../pipeline/pipeline-engine'
import { Bindings } from '../../rdf/bindings'
import ExecutionContext from '../context/execution-context'
import ContextSymbols from '../context/symbols'

/**
 * A ServiceStageBuilder is responsible for evaluation a SERVICE clause in a SPARQL query.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class ServiceStageBuilder extends StageBuilder {
  /**
   * Build a {@link PipelineStage} to evaluate a SERVICE clause
   * @param  source  - Input {@link PipelineStage}
   * @param  node    - Service clause
   * @param  options - Execution options
   * @return A {@link PipelineStage} used to evaluate a SERVICE clause
   */
  execute (source: PipelineStage<Bindings>, node: Algebra.ServiceNode, context: ExecutionContext): PipelineStage<Bindings> {
    let subquery: Algebra.RootNode
    if (node.patterns[0].type === 'query') {
      subquery = node.patterns[0] as Algebra.RootNode
    } else {
      subquery = {
        prefixes: context.getProperty(ContextSymbols.PREFIXES),
        queryType: 'SELECT',
        variables: ['*'],
        type: 'query',
        where: node.patterns
      }
    }
    // auto-add the graph used to evaluate the SERVICE close if it is missing from the dataset
    if ((this.dataset.getDefaultGraph().iri !== node.name) && (!this.dataset.hasNamedGraph(node.name))) {
      const graph = this.dataset.createGraph(node.name)
      this.dataset.addNamedGraph(node.name, graph)
    }
    let handler = undefined
    if (node.silent) {
      handler = () => {
        return Pipeline.getInstance().empty<Bindings>()
      }
    }
    return Pipeline.getInstance().catch<Bindings, Bindings>(this._buildIterator(source, node.name, subquery, context), handler)
  }

  /**
   * Returns a {@link PipelineStage} used to evaluate a SERVICE clause
   * @abstract
   * @param source    - Input {@link PipelineStage}
   * @param iri       - Iri of the SERVICE clause
   * @param subquery  - Subquery to be evaluated
   * @param options   - Execution options
   * @return A {@link PipelineStage} used to evaluate a SERVICE clause
   */
  _buildIterator (source: PipelineStage<Bindings>, iri: string, subquery: Algebra.RootNode, context: ExecutionContext): PipelineStage<Bindings> {
    const opts = context.clone()
    opts.defaultGraphs = [ iri ]
    return this._builder!._buildQueryPlan(subquery, opts, source)
  }
}
