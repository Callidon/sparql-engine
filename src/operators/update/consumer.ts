/* file : consumer.ts
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

import { AsyncIterator } from 'asynciterator'
import { Writable } from 'stream'

/**
 * Something whose execution can be resolved as a Promise
 */
export interface Consumable {
  execute (): Promise<void>
}

/**
 * A Consumer consumes bindings from an iterator to evaluate a SPARQL UPDATE query
 * @abstract
 * @extends Writable
 * @author Thomas Minier
 */
export abstract class Consumer extends Writable implements Consumable {
  readonly _source: AsyncIterator
  readonly _options: Object

  constructor (source: AsyncIterator, options: Object) {
    super({ objectMode: true })
    this._source = source
    this._options = options
  }

  execute (): Promise<void> {
    // if the source has already ended, no need to drain it
    if (this._source.ended) {
      return new Promise(resolve => {
        this.end(null, '', resolve)
      })
    }
    return new Promise((resolve, reject) => {
      this._source.on('end', () => {
        this.end(null, '', resolve)
      })
      this._source.on('error', reject)
      this._source.on('data', bindings => {
        this.write(bindings)
      })
    })
  }
}
