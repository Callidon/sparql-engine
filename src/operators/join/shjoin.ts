/* file : shjoin.ts
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

import { Observable, from, merge, empty } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
import HashJoinTable from './hash-join-table'
import { Bindings } from '../../rdf/bindings'

/**
 * Utility function used to perform one half of a symmetric hash join
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  source  - Source of bindings
 * @param  innerTable - Hash table in which bindings are inserted
 * @param  outerTable - Hash table in which bindings are probed
 * @return An Observable that performs one half of a symmetric hash join
 */
function halfHashJoin (joinKey: string, source: Observable<Bindings>, innerTable: HashJoinTable, outerTable: HashJoinTable): Observable<Bindings> {
  return source.pipe(mergeMap((bindings: Bindings) => {
    if (!bindings.has(joinKey)) {
      return empty()
    }
    const key = bindings.get(joinKey)!

    // insert into inner table
    innerTable.put(key, bindings)

    // probe into outer table
    return from(outerTable.join(key, bindings))
  }))
}

/**
 * Perform a Symmetric Hash Join between two sources
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  left - Left source
 * @param  right - Right source
 * @return An Observable that performs a symmetric hash join between the sources
 */
export default function symHashJoin (joinKey: string, left: Observable<Bindings>, right: Observable<Bindings>) {
  const leftTable = new HashJoinTable()
  const rightTable = new HashJoinTable()
  const leftOp = halfHashJoin(joinKey, left, leftTable, rightTable)
  const rightOp = halfHashJoin(joinKey, right, rightTable, leftTable)
  return merge(leftOp, rightOp)
}
