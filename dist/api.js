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
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var dataset_1 = require("./rdf/dataset");
exports.Dataset = dataset_1.default;
var bindings_1 = require("./rdf/bindings");
exports.BindingBase = bindings_1.BindingBase;
var hashmap_dataset_1 = require("./rdf/hashmap-dataset");
exports.HashMapDataset = hashmap_dataset_1.default;
var graph_1 = require("./rdf/graph");
exports.Graph = graph_1.default;
var plan_builder_1 = require("./engine/plan-builder");
exports.PlanBuilder = plan_builder_1.default;
// executors
var aggregate_executor_1 = require("./engine/executors/aggregate-executor");
exports.AggregateExecutor = aggregate_executor_1.default;
var bgp_executor_1 = require("./engine/executors/bgp-executor");
exports.BGPExecutor = bgp_executor_1.default;
var graph_executor_1 = require("./engine/executors/graph-executor");
exports.GraphExecutor = graph_executor_1.default;
var service_executor_1 = require("./engine/executors/service-executor");
exports.ServiceExecutor = service_executor_1.default;
var update_executor_1 = require("./engine/executors/update-executor");
exports.UpdateExecutor = update_executor_1.default;
// RDF terms Utilities
var rdf_terms_1 = require("./rdf-terms");
exports.terms = rdf_terms_1.terms;
