/* file : rxjs-pipeline.ts
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

import { Observable, Subscriber, empty, from, of, concat } from 'rxjs'
import {
  bufferCount,
  catchError,
  defaultIfEmpty,
  distinct,
  endWith,
  filter,
  finalize,
  first,
  flatMap,
  take,
  skip,
  map,
  mergeMap,
  tap,
  toArray,
  shareReplay,
  reduce
} from 'rxjs/operators'
import { StreamPipelineInput, PipelineEngine } from './pipeline-engine'

/**
 * A StreamPipelineInput implemented using Rxjs' subscribers.
 * @author Thomas Minier
 */
export class RxjsStreamInput<T> implements StreamPipelineInput<T> {
  private readonly _subscriber: Subscriber<T>

  constructor (subscriber: Subscriber<T>) {
    this._subscriber = subscriber
  }

  next (value: T): void {
    this._subscriber.next(value)
  }

  complete (): void {
    this._subscriber.complete()
  }

  error (err: any): void {
    this._subscriber.error(err)
  }
}

/**
 * A pipeline implemented using Rx.js
 * @author Thomas Minier
 */
export default class RxjsPipeline extends PipelineEngine {

  empty<T> (): Observable<T> {
    return empty()
  }

  of<T> (...values: T[]): Observable<T> {
    return of(...values)
  }

  from (x: any): Observable<any> {
    return from(x)
  }

  fromAsync<T> (cb: (input: StreamPipelineInput<T>) => void): Observable<T> {
    return new Observable<T>(subscriber => cb(new RxjsStreamInput(subscriber)))
  }

  clone<T> (stage: Observable<T>): Observable<T> {
    return stage.pipe(shareReplay(5))
  }

  catch<T, O> (input: Observable<T>, handler?: (err: Error) => Observable<O>): Observable<T | O> {
    return input.pipe(catchError(err => {
      if (handler === undefined) {
        throw err
      } else {
        return handler(err)
      }
    }))
  }

  merge<T> (...inputs: Array<Observable<T>>): Observable<T> {
    return concat(...inputs)
  }

  map<F, T> (input: Observable<F>, mapper: (value: F) => T): Observable<T> {
    return input.pipe(map(mapper))
  }

  flatMap<F, T> (input: Observable<F>, mapper: (value: F) => T[]): Observable<T> {
    return input.pipe(flatMap(mapper))
  }

  mergeMap<F, T> (input: Observable<F>, mapper: (value: F) => Observable<T>): Observable<T> {
    return input.pipe(mergeMap(mapper))
  }

  filter<T> (input: Observable<T>, predicate: (value: T) => boolean): Observable<T> {
    return input.pipe(filter(predicate))
  }

  finalize<T> (input: Observable<T>, callback: () => void): Observable<T> {
    return input.pipe(finalize(callback))
  }

  reduce<F, T> (input: Observable<F>, reducer: (acc: T, value: F) => T, initial: T): Observable<T> {
    return input.pipe(reduce(reducer, initial))
  }

  limit<T> (input: Observable<T>, stopAfter: number): Observable<T> {
    return input.pipe(take(stopAfter))
  }

  skip<T> (input: Observable<T>, toSkip: number): Observable<T> {
    return input.pipe(skip(toSkip))
  }

  distinct<T, K> (input: Observable<T>, selector?: (value: T) => T | K): Observable<T> {
    return input.pipe(distinct(selector))
  }

  defaultValues<T> (input: Observable<T>, ...values: T[]): Observable<T> {
    if (values.length === 0) {
      return input
    } else if (values.length === 1) {
      return input.pipe(defaultIfEmpty(values[0]))
    } else {
      return new Observable<T>(subscriber => {
        let isEmpty: boolean = true
        return input.subscribe((x: T) => {
          isEmpty = false
          subscriber.next(x)
        },
        err => subscriber.error(err),
        () => {
          if (isEmpty) {
            values.forEach((v: T) => subscriber.next(v))
          }
          subscriber.complete()
        })
      })
    }
  }

  bufferCount<T> (input: Observable<T>, count: number): Observable<T[]> {
    return input.pipe(bufferCount(count))
  }

  forEach<T> (input: Observable<T>, cb: (value: T) => void): void {
    input.forEach(cb)
      .then()
      .catch(err => { throw err })
  }

  first<T> (input: Observable<T>): Observable<T> {
    return input.pipe(first())
  }

  endWith<T> (input: Observable<T>, values: T[]): Observable<T> {
    return input.pipe(endWith(...values))
  }

  tap<T> (input: Observable<T>, cb: (value: T) => void): Observable<T> {
    return input.pipe(tap(cb))
  }

  collect<T> (input: Observable<T>): Observable<T[]> {
    return input.pipe(toArray())
  }
}
