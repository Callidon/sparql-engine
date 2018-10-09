/* file : exists.ts
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

import { Observable, of } from 'rxjs'
import { first } from 'rxjs/operators'
import { Bindings } from '../rdf/bindings'
import PlanBuilder from '../engine/plan-builder'

/**
 * Evaluates a SPARQL FILTER (NOT) EXISTS clause
 * @param groups    - Content of the FILTER clause
 * @param builder   - Plan builder used to evaluate subqueries
 * @param notexists - True if the filter is NOT EXISTS, False otherwise
 * @param options   - Execution options
 * @author Thomas Minier
 */
export default function exists (groups: any[], builder: PlanBuilder, notexists: boolean, options: Object) {
  return function (source: Observable<Bindings>) {
    return new Observable<Bindings>(subscriber => {
      return source.subscribe((bindings: Bindings) => {
        let exists = false
        // build an iterator to evaluate the EXISTS clause using the set of bindings
        // using a LIMIT 1, to minimize the evaluation cost
        const evaluator = builder._buildWhere(of(bindings), groups, options).pipe(first())
        evaluator.subscribe(() => {
          exists = true
        }, (err: Error) => subscriber.error(err), () => {
          if (exists && (!notexists)) {
            // EXISTS case
            subscriber.next(bindings)
          } else if ((!exists) && notexists) {
            // NOT EXISTS case
            subscriber.next(bindings)
          }
        })
      },
      err => subscriber.error(err),
      () => subscriber.complete())
    })
  }
}
// export default class ExistsOperator extends TransformIterator<Bindings,Bindings> {
//   private readonly _groups: Object[]
//   private readonly _builder: any
//   private readonly _options: Object
//   private readonly _notexists: boolean
//
//   /**
//    * Constructor
//    * @param source    - Source iterator
//    * @param groups    - Content of the FILTER clause
//    * @param builder   - Plan builder used to evaluate subqueries
//    * @param notexists - True if the filter is NOT EXISTS, False otherwise
//    * @param options   - Execution options
//    */
//   constructor (source: AsyncIterator<Bindings>, groups: Object[], builder: PlanBuilder, notexists: boolean, options: Object) {
//     super(source, options)
//     this._groups = groups
//     this._builder = builder
//     this._options = options
//     this._notexists = notexists
//     source.on('error', err => this.emit('error', err))
//   }
//
//   _transform (bindings: Bindings, done: () => void): void {
//     let exists = false
//     // build an iterator to evaluate the EXISTS clause using the set of bindings
//     // using a LIMIT 1, to minimize the evaluation cost
//     const iterator = this._builder._buildWhere(single(bindings), this._groups, this._options).take(1)
//     iterator.on('error', (err: Error) => this.emit('error', err))
//     iterator.on('end', () => {
//       if (exists && (!this._notexists)) {
//         // EXISTS case
//         this._push(bindings)
//       } else if ((!exists) && this._notexists) {
//         // NOT EXISTS case
//         this._push(bindings)
//       }
//       done()
//     })
//     iterator.on('data', () => {
//       exists = true
//     })
//   }
// }
