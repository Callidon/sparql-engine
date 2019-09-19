/* file : vector-pipeline.ts
MIT License

Copyright (c) 2019 Thomas Minier

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

import { PipelineInput, StreamPipelineInput, PipelineStage, PipelineEngine } from './pipeline-engine'
import { chunk, flatMap, flatten, isUndefined, slice, uniq, uniqBy } from 'lodash'

/**
 * A PipelineStage which materializes all intermediate results in main memory.
 * @author Thomas Minier
 */
export class VectorStage<T> implements PipelineStage<T> {
  // We need to use Promise to store the stage content,
  // as some computations can require asynchronous computations.
  // For example, the RDF graph can send HTTP requests to evaluate triple patterns.
  private readonly _content: Promise<Array<T>>

  constructor(content: Promise<Array<T>>) {
    this._content = content
  }

  getContent(): Promise<Array<T>> {
    return this._content
  }

  subscribe(onData: (value: T) => void, onError: (err: any) => void, onEnd: () => void): void {
    try {
      this._content
        .then(c => {
          c.forEach(onData)
          onEnd()
        })
        .catch(onError)
    } catch (e) {
      onError(e)
    }
  }

  forEach(cb: (value: T) => void): void {
    this._content
      .then(c => {
        c.forEach(cb)
      })
  }
}

export class VectorStreamInput<T> implements StreamPipelineInput<T> {
  private readonly _resolve: (value: T[]) => void
  private readonly _reject: (err: any) => void
  private _content: Array<T>

  constructor(resolve: any, reject: any) {
    this._resolve = resolve
    this._reject = reject
    this._content = []
  }

  next(value: T): void {
    this._content.push(value)
  }

  error(err: any): void {
    this._reject(err)
  }

  complete(): void {
    this._resolve(this._content)
  }
}

/**
 * A pipeline implemented using {@link VectorStage}, *i.e.*, all intermediate results are materialized in main memory. This approach is often called **vectorized approach**.
 * This pipeline is more efficient CPU-wise than {@link RxjsPipeline}, but it also consumes much more memory, as it materializes evey stage of the pipeline before moving to the next.
 * It should only be used when SPARQL queries generate few intermediate results.
 * @see P. A. Boncz, S. Manegold, and M. L. Kersten. "Database architecture evolution: Mammals flourished long before dinosaurs became extinct". PVLDB, (2009)
 * @author Thomas Minier
 */
export default class VectorPipeline extends PipelineEngine {

  empty<T>(): VectorStage<T> {
    return new VectorStage<T>(Promise.resolve([]))
  }

  of<T>(...values: T[]): VectorStage<T> {
    return new VectorStage<T>(Promise.resolve(values))
  }

  from<T>(x: PipelineInput<T>): VectorStage<T> {
    if ((x as VectorStage<T>).getContent !== undefined) {
      return new VectorStage<T>((x as VectorStage<T>).getContent())
    } else if (Array.isArray(x)) {
      return new VectorStage<T>(Promise.resolve(x))
    } else if ((x as Promise<T>).then !== undefined) {
      return new VectorStage<T>((x as Promise<T>).then(v => [v]))
    } else if (Symbol.iterator in x) {
      return new VectorStage<T>(Promise.resolve(Array.from(x as Iterable<T>)))
    }
    throw new Error('Invalid argument for VectorPipeline.from: ' + x)
  }

  fromAsync<T>(cb :(input : StreamPipelineInput<T>) => void): VectorStage<T> {
    return new VectorStage<T>(new Promise<T[]>((resolve, reject) => {
      cb(new VectorStreamInput<T>(resolve, reject))
    }))
  }

  clone<T>(stage: VectorStage<T>): VectorStage<T> {
    return new VectorStage<T>(stage.getContent().then(c => c.slice(0)))
  }

  catch<T,O>(input: VectorStage<T>, handler?: (err: Error) => VectorStage<O>): VectorStage<T | O> {
    return new VectorStage<T | O>(new Promise((resolve, reject) => {
      input.getContent()
        .then(c => resolve(c.slice(0)))
        .catch(err => {
          if (handler === undefined) {
            reject(err)
          } else {
            handler(err).getContent()
              .then(c => resolve(c.slice(0)))
          }
        })
    }))
  }

  merge<T>(...inputs: Array<VectorStage<T>>): VectorStage<T> {
    return new VectorStage<T>(Promise.all(inputs.map(i => i.getContent())).then((contents: T[][]) => {
      return flatten(contents)
    }))
  }

  map<F,T>(input: VectorStage<F>, mapper: (value: F) => T): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(c => c.map(mapper)))
  }

  flatMap<F,T>(input: VectorStage<F>, mapper: (value: F) => T[]): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(c => flatMap(c, mapper)))
  }

  mergeMap<F,T>(input: VectorStage<F>, mapper: (value: F) => VectorStage<T>): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(content => {
      const stages: VectorStage<T>[] = content.map(value => mapper(value))
      return Promise.all(stages.map(s => s.getContent())).then((contents: T[][]) => {
        return flatten(contents)
      })
    }))
  }

  filter<T>(input: VectorStage<T>, predicate: (value: T) => boolean): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(c => c.filter(predicate)))
  }

  reduce<F,T>(input: VectorStage<F>, reducer: (acc: T, value: F) => T, initial: T): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(c => [c.reduce(reducer, initial)]))
  }

  limit<T>(input: VectorStage<T>, stopAfter: number): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(c => slice(c, 0, stopAfter)))
  }

  skip<T>(input: VectorStage<T>, toSkip: number): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(c => slice(c, toSkip)))
  }

  distinct<T, K>(input: VectorStage<T>, selector?: (value: T) => K): VectorStage<T> {
    if (isUndefined(selector)) {
      return new VectorStage<T>(input.getContent().then(c => uniq(c)))
    }
    return new VectorStage<T>(input.getContent().then(c => uniqBy(c, selector)))
  }

  defaultValues<T>(input: VectorStage<T>, ...values: T[]): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(content => {
      if (content.length > 0) {
        return content.slice(0)
      }
      return values
    }))
  }

  bufferCount<T>(input: VectorStage<T>, count: number): VectorStage<T[]> {
    return new VectorStage<T[]>(input.getContent().then(c => chunk(c, count)))
  }

  forEach<T>(input: VectorStage<T>, cb: (value: T) => void): void {
    input.forEach(cb)
  }

  first<T>(input: VectorStage<T>): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then(content => {
      if (content.length < 1) {
        return []
      }
      return [content[0]]
    }))
  }

  collect<T>(input: VectorStage<T>): VectorStage<T[]> {
    return new VectorStage<T[]>(input.getContent().then(c => [c]))
  }
}
