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

import { PipelineStage } from '../../engine/pipeline/pipeline-engine'
import { Writable } from 'stream'
import { Algebra } from 'sparqljs'

/**
 * Something whose execution can be resolved as a Promise
 */
export interface Consumable {
  /**
   * Execute the consumable
   * @return A Promise fulfilled when the execution has been completed
   */
  execute (): Promise<void>
}

/**
 * A Consumable that always fails to execute
 */
export class ErrorConsumable implements Consumable {
  private readonly _reason: Error

  /**
   * Constructor
   * @param reason - Cause of the failure
   */
  constructor (reason: string) {
    this._reason = new Error(reason)
  }

  execute (): Promise<void> {
    return Promise.reject(this._reason)
  }
}

/**
 * A Consumer consumes bindings from an iterator to evaluate a SPARQL UPDATE query
 * @abstract
 * @extends Writable
 * @author Thomas Minier
 */
export abstract class Consumer extends Writable implements Consumable {
  private readonly _source: PipelineStage<Algebra.TripleObject>
  private readonly _options: Object

  /**
   * Constructor
   * @param source - Input {@link PipelineStage}
   * @param options - Execution options
   */
  constructor (source: PipelineStage<Algebra.TripleObject>, options: Object) {
    super({ objectMode: true })
    this._source = source
    this._options = options
  }

  execute (): Promise<void> {
    // if the source has already ended, no need to drain it
    return new Promise((resolve, reject) => {
      this._source.subscribe(triple => {
        this.write(triple)
      }, reject, () => {
        this.end(null, '', resolve)
      })
    })
  }
}
