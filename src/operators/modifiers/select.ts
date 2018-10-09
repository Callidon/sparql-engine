/* file : select.ts
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

import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Algebra } from 'sparqljs'
import { rdf } from '../../utils'
import { Bindings } from '../../rdf/bindings'

/**
 * Evaluates a SPARQL SELECT operation, i.e., perform a selection over sets of solutions bindings
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#select}
 * @param query - SELECT query
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default function select (source: Observable<Bindings>, query: Algebra.RootNode) {
  const variables = <string[]> query.variables
  const selectAll = variables.length === 1 && variables[0] === '*'
  return source.pipe(map((bindings: Bindings) => {
    if (!selectAll) {
      bindings = variables.reduce((obj, v) => {
        if (bindings.has(v)) {
          obj.set(v, bindings.get(v)!)
        } else {
          obj.set(v, 'UNBOUND')
        }
        return obj
      }, bindings.empty())
    }
    return bindings.mapValues((k, v) => rdf.isVariable(k) && typeof v === 'string' ? v : null)
  }))
}
// export default class SelectOperator extends TransformIterator<Bindings,Bindings> {
//   private readonly _variables: string[]
//   private readonly _selectAll: boolean
//
//   /**
//    * Constructor
//    * @param source - Source iterator
//    * @param query - SELECT query
//    * @param options - Execution options
//    */
//   constructor (source: AsyncIterator<Bindings>, query: Algebra.RootNode, options: Object) {
//     super(source, options)
//     this._variables = <string[]> query.variables
//     this._selectAll = this._variables.length === 1 && this._variables[0] === '*'
//     source.on('error', (err: Error) => this.emit('error', err))
//   }
//
//   _transform (bindings: Bindings, done: () => void): void {
//     // perform projection (if necessary)
//     if (!this._selectAll) {
//       bindings = this._variables.reduce((obj, v) => {
//         if (bindings.has(v)) {
//           obj.set(v, bindings.get(v)!)
//         } else {
//           obj.set(v, 'UNBOUND')
//         }
//         return obj
//       }, bindings.empty())
//     }
//     const x = bindings.mapValues((k, v) => rdf.isVariable(k) && typeof v === 'string' ? v : null)
//     // remove non-variables entries && non-string values
//     this._push(x)
//     done()
//   }
// }
