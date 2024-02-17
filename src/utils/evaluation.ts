/* file : utils.ts
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

import * as SPARQL from 'sparqljs'
import { v4 as uuid } from 'uuid'
import { BGPCache } from '../engine/cache/bgp-cache.js'
import ExecutionContext from '../engine/context/execution-context.js'
import ContextSymbols from '../engine/context/symbols.js'
import { PipelineStage } from '../engine/pipeline/pipeline-engine.js'
import { Pipeline } from '../engine/pipeline/pipeline.js'
import BGPStageBuilder from '../engine/stages/bgp-stage-builder.js'
import { Bindings } from '../rdf/bindings.js'
import Graph from '../rdf/graph.js'

/**
 * Utilities related to SPARQL query evaluation
 * @author Thomas Minier
 */

/**
 * Evaluate a Basic Graph pattern on a RDF graph using a cache
 * @param bgp - Basic Graph pattern to evaluate
 * @param graph - RDF graph
 * @param cache - Cache used
 * @return A pipeline stage that produces the evaluation results
 */
export function cacheEvalBGP(
  patterns: SPARQL.Triple[],
  graph: Graph,
  cache: BGPCache,
  builder: BGPStageBuilder,
  context: ExecutionContext,
): PipelineStage<Bindings> {
  const bgp = {
    patterns,
    graphIRI: graph.iri,
  }
  const [subsetBGP, missingBGP] = cache.findSubset(bgp)
  // case 1: no subset of the BGP are in cache => classic evaluation (most frequent)
  if (subsetBGP.length === 0) {
    // we cannot cache the BGP if the query has a LIMIT and/or OFFSET modiifier
    // otherwise we will cache incomplete results. So, we just evaluate the BGP
    if (
      context.hasProperty(ContextSymbols.HAS_LIMIT_OFFSET) &&
      context.getProperty(ContextSymbols.HAS_LIMIT_OFFSET)
    ) {
      return graph.evalBGP(patterns, context)
    }
    // generate an unique writer ID
    const writerID = uuid()
    // evaluate the BGP while saving all solutions into the cache
    const iterator = Pipeline.getInstance().tap(
      graph.evalBGP(patterns, context),
      (b) => {
        cache.update(bgp, b, writerID)
      },
    )
    // commit the cache entry when the BGP evaluation is done
    return Pipeline.getInstance().finalize(iterator, () => {
      cache.commit(bgp, writerID)
    })
  }
  // case 2: no missing patterns => the complete BGP is in the cache
  if (missingBGP.length === 0) {
    return cache.getAsPipeline(bgp, () => graph.evalBGP(patterns, context))
  }
  const cachedBGP = {
    patterns: subsetBGP,
    graphIRI: graph.iri,
  }
  // case 3: evaluate the subset BGP using the cache, then join with the missing patterns
  const iterator = cache.getAsPipeline(cachedBGP, () =>
    graph.evalBGP(subsetBGP, context),
  )
  return builder.execute(iterator, missingBGP, context)
}
