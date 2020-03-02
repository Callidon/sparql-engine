/* file : many-consumers.js
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

import { Consumable } from './consumer'

/**
 * ManyConsumers group multiple {@link Consumable} to be evaluated in sequence
 * @author Thomas Minier
 */
export default class ManyConsumers implements Consumable {
  private readonly _consumers: Consumable[]

  /**
   * Constructor
   * @param consumers - Set of consumables
   */
  constructor (consumers: Consumable[]) {
    this._consumers = consumers
  }

  execute (): Promise<void> {
    if (this._consumers.length === 1) {
      return this._consumers[0].execute()
    }
    return this._consumers.reduce((prev, consumer) => {
      return prev.then(() => consumer.execute())
    }, Promise.resolve())
  }
}
