/* file : union-iterator.ts
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

import { AsyncIterator, BufferedIterator } from 'asynciterator'
import { isNull, pull, range } from 'lodash'

/**
 * UnionOperator implements a Bag Union between N operators
 * @template T - Type of the items produced by the Union of operators
 * @extends BufferedIterator
 * @memberof Operators
 * @author Thomas Minier
 */
export default class UnionOperator<T> extends BufferedIterator<T> {
  private readonly _sources: AsyncIterator<T>[]
  private _sIndex: number
  private _openSources: number[]
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator[]} sources - The sources to read from
   */
  constructor (...sources: AsyncIterator<T>[]) {
    super()
    this._sources = sources
    this._sIndex = 0
    this._openSources = range(this._sources.length)
    this._sources.forEach(s => {
      s.on('readable', () => this._fillBuffer())
      s.on('end', () => this._fillBuffer())
      s.on('error', err => this.emit('error', err))
    })
  }

  /**
   * Get the number of open sources, i.e. sources from which you can still read items
   * @return {integer} The number of open sources
   */
  get nbOpenSources (): number {
    return this._openSources.length
  }

  /**
   * Read an item from a given source
   * @param  {integer} index - Index of the source to read from
   * @return {*} The item read from the given source
   */
  readFrom (index: number): any {
    const source = this._sources[index]
    const item = source.read()
    if (source.closed) {
      pull(this._openSources, index)
    }
    return item
  }

  /**
   * Try to read from each source in a round robin way, and stop when all source have been interrogated once
   * or `limit` reads have been performed.
   * @param  {Function} callback - Callback invoked each item an item has been read with success
   * @param  {integer}  limit    - Maximum number of items to read.
   * @return {void}
   */
  cycle (callback: (item: any) => void, limit: number = Infinity): void {
    let item = null
    let nbReads = 0
    let cycles = 0
    // read N items in a round robin way (N = limit) while there are still open sources
    while (this.nbOpenSources > 0 && cycles < this.nbOpenSources && nbReads < limit) {
      item = this.readFrom(this._sIndex)
      this._sIndex = this._openSources[(this._sIndex + 1) % this.nbOpenSources]
      if (!isNull(item)) {
        callback(item)
        nbReads++
      }
      cycles++
    }
    // close operator when no more sources are available
    if (this.nbOpenSources === 0) this.close()
  }

  /**
   * Read the next available item from the remaining sources
   * @private
   * @param {int} count - The number of items to generate
   * @param {function} done - To be called when reading is completed
   * @return {void}
   */
  _read (count: number, done: () => void): void {
    this.cycle(mappings => {
      this._push(mappings)
    }, count)
    done()
  }
}
