/* file : minus-operator.ts
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

import { AsyncIterator, TransformIterator } from 'asynciterator'
import { intersection } from 'lodash'
import { Bindings } from '../rdf/bindings'

/**
 * Evaluates a SPARQL MINUS clause
 * @see https://www.w3.org/TR/sparql11-query/#neg-minus
 * @extends TransformIterator
 * @author Thomas Minier
 */
export default class MinusOperator extends TransformIterator<Bindings,Bindings> {
  readonly _rightSource: AsyncIterator<Bindings>
  _rightBuffer: Bindings[]
  readonly _options: Object

  constructor (leftSource: AsyncIterator<Bindings>, rightSource: AsyncIterator<Bindings>, options: Object) {
    super(leftSource, options)
    this._rightSource = rightSource
    this._rightBuffer = []
    this._options = options
    this._rightSource.on('error', err => {
      this.emit('error', err)
    })
  }

  _begin (done: () => void): void {
    // first, evaluates the right-source and buffer bindings
    this._rightSource.on('end', done)
    this._rightSource.on('data', b => {
      this._rightBuffer.push(b)
    })
  }

  _transform (bindings: Bindings, done: () => void): void {
    const leftKeys = Array.from(bindings.variables())
    // mu_a is compatible with mu_b if,
    // for all v in intersection(dom(mu_a), dom(mu_b)), mu_a[v] = mu_b[v]
    const isCompatible = this._rightBuffer.some((b: Bindings) => {
      const rightKeys = Array.from(b.variables())
      const commonKeys = intersection(leftKeys, rightKeys)
      return commonKeys.every((k: string) => b.get(k) === bindings.get(k))
    })
    // only output non-compatible bindings
    if (!isCompatible) {
      this._push(bindings)
    }
    done()
  }
}
