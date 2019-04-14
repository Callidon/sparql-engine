/* file : hash-join.ts
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

import { Pipeline } from '../../engine/pipeline/pipeline'
import { PipelineStage } from '../../engine/pipeline/pipeline-engine'
import HashJoinTable from './hash-join-table'
import { Bindings } from '../../rdf/bindings'

/**
 * Perform a traditional Hash join between two sources, i.e., materialize the right source in a hash table and then read from the left source while probing into the hash table.
 * @param  left - Left source (a {@link PipelineStage})
 * @param  right - Right source (a {@link PipelineStage})
 * @param  joinKey - SPARQL variable used as join attribute
 * @return A {@link PipelineStage} which performs a Hash join
 */
export default function hashJoin (left: PipelineStage<Bindings>, right: PipelineStage<Bindings>, joinKey: string) {
  const joinTable = new HashJoinTable()
  const engine = Pipeline.getInstance()
  return engine.mergeMap(engine.collect(right), (values: Bindings[]) => {
    // materialize right relation into the hash table
    values.forEach(v => {
      if (v.has(joinKey)) {
        joinTable.put(v.get(joinKey)!, v)
      }
    })
    // read from left and probe each value into the hash table
    return engine.mergeMap(left, (bindings: Bindings) => {
      return engine.from(joinTable.join(bindings.get(joinKey)!, bindings))
    })
  })
}
