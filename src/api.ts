/* file : api.ts
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

// stages builders
import { SPARQL_OPERATION } from './engine/plan-builder.js'
import AggregateStageBuilder from './engine/stages/aggregate-stage-builder.js'
import BGPStageBuilder from './engine/stages/bgp-stage-builder.js'
import BindStageBuilder from './engine/stages/bind-stage-builder.js'
import DistinctStageBuilder from './engine/stages/distinct-stage-builder.js'
import FilterStageBuilder from './engine/stages/filter-stage-builder.js'
import GlushkovStageBuilder from './engine/stages/glushkov-executor/glushkov-stage-builder.js'
import GraphStageBuilder from './engine/stages/graph-stage-builder.js'
import MinusStageBuilder from './engine/stages/minus-stage-builder.js'
import OptionalStageBuilder from './engine/stages/optional-stage-builder.js'
import OrderByStageBuilder from './engine/stages/orderby-stage-builder.js'
import ServiceStageBuilder from './engine/stages/service-stage-builder.js'
import UnionStageBuilder from './engine/stages/union-stage-builder.js'
import UpdateStageBuilder from './engine/stages/update-stage-builder.js'

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

// base types
export { default as ExecutionContext } from './engine/context/execution-context.js'
export { PipelineEngine, PipelineInput, PipelineStage, StreamPipelineInput } from './engine/pipeline/pipeline-engine.js'
// pipeline
export { Pipeline } from './engine/pipeline/pipeline.js'
export { default as RxjsPipeline } from './engine/pipeline/rxjs-pipeline.js'
export { default as VectorPipeline } from './engine/pipeline/vector-pipeline.js'
export { PlanBuilder } from './engine/plan-builder.js'
export { csvFormatter as CSVFormat, tsvFormatter as TSVFormat } from './formatters/csv-tsv-formatter.js'
// Formatters
export { default as JsonFormat } from './formatters/json-formatter.js'
export { BindingBase, Bindings } from './rdf/bindings.js'
export { default as Dataset } from './rdf/dataset.js'
export { default as Graph } from './rdf/graph.js'
export { default as HashMapDataset } from './rdf/hashmap-dataset.js'
// RDF terms Utilities
export { rdf } from './utils.js'
export { stages }


