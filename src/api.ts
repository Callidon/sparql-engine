/* file : api.ts
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

import AggregateStageBuilder from './engine/stages/aggregate-stage-builder'
import BGPStageBuilder from './engine/stages/bgp-stage-builder'
import BindStageBuilder from './engine/stages/bind-stage-builder'
import DistinctStageBuilder from './engine/stages/distinct-stage-builder'
import FilterStageBuilder from './engine/stages/filter-stage-builder'
import GlushkovStageBuilder from './engine/stages/glushkov-executor/glushkov-stage-builder'
import GraphStageBuilder from './engine/stages/graph-stage-builder'
import MinusStageBuilder from './engine/stages/minus-stage-builder'
import ServiceStageBuilder from './engine/stages/service-stage-builder'
import OptionalStageBuilder from './engine/stages/optional-stage-builder'
import OrderByStageBuilder from './engine/stages/orderby-stage-builder'
import UnionStageBuilder from './engine/stages/union-stage-builder'
import UpdateStageBuilder from './engine/stages/update-stage-builder'

export { default as Dataset } from './rdf/dataset'
export { BindingBase } from './rdf/bindings'
export { default as HashMapDataset } from './rdf/hashmap-dataset'
export { default as Graph } from './rdf/graph'
export { default as ExecutionContext } from './engine/context/execution-context'
export { PlanBuilder } from './engine/plan-builder'
import { SPARQL_OPERATION } from './engine/plan-builder'
// pipeline
export { Pipeline } from './engine/pipeline/pipeline'
export { PipelineEngine, PipelineInput } from './engine/pipeline/pipeline-engine'
export { default as RxjsPipeline } from './engine/pipeline/rxjs-pipeline'
export { default as VectorPipeline } from './engine/pipeline/vector-pipeline'
// RDF terms Utilities
export { terms } from './rdf-terms'
// stages builders
const stages = {
  SPARQL_OPERATION,
  AggregateStageBuilder,
  BGPStageBuilder,
  BindStageBuilder,
  DistinctStageBuilder,
  FilterStageBuilder,
  GlushkovStageBuilder,
  GraphStageBuilder,
  MinusStageBuilder,
  ServiceStageBuilder,
  OptionalStageBuilder,
  OrderByStageBuilder,
  UnionStageBuilder,
  UpdateStageBuilder
}
export { stages }
