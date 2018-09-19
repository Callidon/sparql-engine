/* file : materialize-operator.ts
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

import { AsyncIterator, BufferedIterator }  from 'asynciterator'
import { isNull, isUndefined } from 'lodash'
import { Bindings } from '../rdf/bindings'

/**
 * An operator that first materialize the input iterator before processing all its bindings
 * @extends BufferedIterator
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class MaterializeOperator extends BufferedIterator<Bindings> {
  private _source: AsyncIterator<Bindings>
  private _bufferedValues: Bindings[]

  constructor (source: AsyncIterator<Bindings>, options: Object) {
    super(options)
    this._source = source
    this._bufferedValues = []
    this._source.on('error', err => this.emit('error', err))
  }

  _preTransform (value: Bindings): Bindings | null {
    return value
  }

  _transformAll (values: Bindings[]): Bindings[] {
    return values
  }

  _transform (value: Bindings, done: () => void): void {
    this._push(value)
    done()
  }

  _begin (done: () => void): void {
    this._source.on('end', () => {
      this._bufferedValues = this._transformAll(this._bufferedValues)
      done()
    })
    this._source.on('data', v => {
      const newValue = this._preTransform(v)
      if ((!isNull(newValue)) && (!isUndefined(newValue))) {
        this._bufferedValues.push(newValue)
      }
    })
  }

  _read (count: number, done: () => void): void {
    if (this._bufferedValues.length > 0) {
      const value = this._bufferedValues.shift()
      this._transform(value!, done)
    } else {
      this.close()
      done()
    }
  }
}
