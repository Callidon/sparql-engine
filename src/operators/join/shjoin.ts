/* file : shjoin.ts
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

import { Pipeline } from '../../engine/pipeline/pipeline'
import { PipelineStage } from '../../engine/pipeline/pipeline-engine'
import HashJoinTable from './hash-join-table'
import { Bindings } from '../../rdf/bindings'

/**
 * Utility function used to perform one half of a symmetric hash join
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  source  - Source of bindings (a {@link PipelineStage})
 * @param  innerTable - Hash table in which bindings are inserted
 * @param  outerTable - Hash table in which bindings are probed
 * @return A {@link PipelineStage} that performs one half of a symmetric hash join
 */
function halfHashJoin (joinKey: string, source: PipelineStage<Bindings>, innerTable: HashJoinTable, outerTable: HashJoinTable): PipelineStage<Bindings> {
  const engine = Pipeline.getInstance()
  return engine.mergeMap(source, (bindings: Bindings) => {
    if (!bindings.has(joinKey)) {
      return engine.empty<Bindings>()
    }
    const key = bindings.get(joinKey)!

    // insert into inner table
    innerTable.put(key, bindings)

    // probe into outer table
    return engine.from(outerTable.join(key, bindings))
  })
}

/**
 * Perform a Symmetric Hash Join between two sources
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  left - Left source (a {@link PipelineStage})
 * @param  right - Right source (a {@link PipelineStage})
 * @return A {@link PipelineStage} that performs a symmetric hash join between the sources
 */
export default function symHashJoin (joinKey: string, left: PipelineStage<Bindings>, right: PipelineStage<Bindings>) {
  const leftTable = new HashJoinTable()
  const rightTable = new HashJoinTable()
  const leftOp = halfHashJoin(joinKey, left, leftTable, rightTable)
  const rightOp = halfHashJoin(joinKey, right, rightTable, leftTable)
  return Pipeline.getInstance().merge(leftOp, rightOp)
}
