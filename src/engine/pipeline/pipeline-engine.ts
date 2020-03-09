/* file : pipeline-engine.ts
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

import { identity, isUndefined, uniqBy } from 'lodash'

/**
 * The input of a {@link PipelineStage}, either another {@link PipelineStage}, an array, an iterable or a promise.
 */
export type PipelineInput<T> = PipelineStage<T> | StreamPipelineInput<T> | Iterable<T> | PromiseLike<T> | ArrayLike<T>

interface SubGroup<K, R> {
  key: K,
  value: R
}

/**
 * An input of a {@link PipelineStage} which produces items in stream/async way.
 * Usefull for connecting a Node.JS stream into a pipeline of iterators.
 * @author Thomas Minier
 */
export interface StreamPipelineInput<T> {
  /**
   * Produces a new value and inject it into the pipeline
   * @param value - New value produced
   */
  next (value: T): void

  /**
   * Close the pipeline input
   */
  complete (): void

  /**
   * Report an error that occurs during execution
   * @param err - The error to report
   */
  error (err: any): void
}

/**
 * A step in a pipeline. Data can be consumed in a pull-based or push-bashed fashion.
 * @author Thomas Minier
 */
export interface PipelineStage<T> {
  /**
   * Subscribes to the items emitted by the stage, in a push-based fashion
   * @param  onData - Function invoked on each item produced by the stage
   * @param  onError - Function invoked in cas of an error
   * @param  onEnd - Function invoked when the stage ends
   */
  subscribe (onData: (value: T) => void, onError: (err: any) => void, onEnd: () => void): void

  /**
   * Invoke a callback on each item produced by the stage
   * @param  cb - Function invoked on each item produced by the stage
   */
  forEach (cb: (value: T) => void): void
}

/**
 * Abstract representation used to apply transformations on a pipeline of iterators.
 * Concrete subclasses are used by the framework to build the query execution pipeline.
 * @abstract
 * @author Thomas Minier
 */
export abstract class PipelineEngine {

  /**
   * Creates a PipelineStage that emits no items
   * @return A PipelineStage that emits no items
   */
  abstract empty<T> (): PipelineStage<T>

  /**
   * Converts the arguments to a PipelineStage
   * @param  values - Values to convert
   * @return A PipelineStage that emits the values
   */
  abstract of<T> (...values: T[]): PipelineStage<T>

  /**
   * Creates a PipelineStage from an Array, an array-like object, a Promise, an iterable object, or an Observable-like object.
   * @param  value - Source object
   * @return A PipelineStage that emits the values contains in the object
   */
  abstract from<T> (value: PipelineInput<T>): PipelineStage<T>

  /**
   * Creates a PipelineStage from a something that emits values asynchronously, using a {@link StreamPipelineInput} to feed values/errors into the pipeline.
   * @param  cb - Callback invoked with a {@link StreamPipelineInput} used to feed values inot the pipeline.
   * @return A PipelineStage that emits the values produces asynchronously
   */
  abstract fromAsync<T> (cb: (input: StreamPipelineInput<T>) => void): PipelineStage<T>

  /**
   * Clone a PipelineStage
   * @param  stage - PipelineStage to clone
   * @return Cloned PipelineStage
   */
  abstract clone<T> (stage: PipelineStage<T>): PipelineStage<T>

  /**
   * Handle errors raised in the pipeline as follows:
   * 1) Default: raise the error
   * 2) Use a handler function to returns a new PipelineStage in case of error
   * @param   input - Source PipelineStage
   * @param   handler - Function called in case of error to generate a new PipelineStage
   * @return Output PipelineStage
   */
  abstract catch<T, O> (input: PipelineStage<T>, handler?: (err: Error) => PipelineStage<O>): PipelineStage<T | O>

  /**
   * Creates an output PipelineStage which concurrently emits all values from every given input PipelineStage.
   * @param  inputs - Inputs PipelineStage
   * @return Output PipelineStage
   */
  abstract merge<T> (...inputs: Array<PipelineStage<T> | PipelineInput<T>>): PipelineStage<T>

  /**
   * Applies a given `mapper` function to each value emitted by the source PipelineStage, and emits the resulting values as a PipelineStage.
   * @param  input  - Source PipelineStage
   * @param  mapper - The function to apply to each value emitted by the source PipelineStage
   * @return A PipelineStage that emits the values from the source PipelineStage transformed by the given `mapper` function.
   */
  abstract map<F, T> (input: PipelineStage<F>, mapper: (value: F) => T): PipelineStage<T>

  /**
   * Projects each source value to a PipelineStage which is merged in the output PipelineStage.
   * @param  input  - Input PipelineStage
   * @param  mapper - Transformation function
   * @return Output PipelineStage
   */
  abstract mergeMap<F, T> (input: PipelineStage<F>, mapper: (value: F) => PipelineStage<T>): PipelineStage<T>

  /**
   * Do something after the PipelineStage has produced all its results
   * @param  input    - Input PipelineStage
   * @param  callback - Function invoked after the PipelineStage has produced all its results
   * @return Output PipelineStage
   */
  abstract finalize<T> (input: PipelineStage<T>, callback: () => void): PipelineStage<T>

  /**
   * Maps each source value to an array of values which is merged in the output PipelineStage.
   * @param  input  - Input PipelineStage
   * @param  mapper - Transformation function
   * @return Output PipelineStage
   */
  flatMap<F, T> (input: PipelineStage<F>, mapper: (value: F) => T[]): PipelineStage<T> {
    return this.mergeMap(input, (value: F) => this.of(...mapper(value)))
  }

  /**
   * Flatten the output of a pipeline stage that emits array of values into single values.
   * @param  input  - Input PipelineStage
   * @return Output PipelineStage
   */
  flatten<T> (input: PipelineStage<T[]>): PipelineStage<T> {
    return this.flatMap(input, v => v)
  }

  /**
   * Filter items emitted by the source PipelineStage by only emitting those that satisfy a specified predicate.
   * @param  input     - Input PipelineStage
   * @param  predicate - Predicate function
   * @return Output PipelineStage
   */
  abstract filter<T> (input: PipelineStage<T>, predicate: (value: T) => boolean): PipelineStage<T>

  /**
   * Applies an accumulator function over the source PipelineStage, and returns the accumulated result when the source completes, given an optional initial value.
   * @param  input   - Input PipelineStage
   * @param  reducer - Accumulator function
   * @return A PipelineStage that emits a single value that is the result of accumulating the values emitted by the source PipelineStage.
   */
  abstract reduce<F, T> (input: PipelineStage<F>, reducer: (acc: T, value: F) => T, initial: T): PipelineStage<T>

  /**
   * Emits only the first `count` values emitted by the source PipelineStage.
   * @param  input - Input PipelineStage
   * @param  count - How many items to take
   * @return A PipelineStage that emits only the first count values emitted by the source PipelineStage, or all of the values from the source if the source emits fewer than count values.
   */
  abstract limit<T> (input: PipelineStage<T>, count: number): PipelineStage<T>

  /**
   * Returns a PipelineStage that skips the first count items emitted by the source PipelineStage.
   * @param  input  - Input PipelineStage
   * @param  count  - How many items to skip
   * @return A PipelineStage that skips values emitted by the source PipelineStage.
   */
  abstract skip<T> (input: PipelineStage<T>, count: number): PipelineStage<T>

  /**
   * Apply a callback on every item emitted by the source PipelineStage
   * @param  input - Input PipelineStage
   * @param  cb    - Callback
   */
  abstract forEach<T> (input: PipelineStage<T>, cb: (value: T) => void): void

  /**
   * Emits given values if the source PipelineStage completes without emitting any next value, otherwise mirrors the source PipelineStage.
   * @param  input        - Input PipelineStage
   * @param  defaultValue - The default values used if the source Observable is empty.
   * @return A PipelineStage that emits either the specified default values if the source PipelineStage emits no items, or the values emitted by the source PipelineStage.
   */
  abstract defaultValues<T> (input: PipelineStage<T>, ...values: T[]): PipelineStage<T>

  /**
   * Buffers the source PipelineStage values until the size hits the maximum bufferSize given.
   * @param  input - Input PipelineStage
   * @param  count - The maximum size of the buffer emitted.
   * @return A PipelineStage of arrays of buffered values.
   */
  abstract bufferCount<T> (input: PipelineStage<T>, count: number): PipelineStage<T[]>

  /**
   * Creates a PipelineStage which collect all items from the source PipelineStage into an array, and then emits this array.
   * @param  input - Input PipelineStage
   * @return A PipelineStage which emits all values emitted by the source PipelineStage as an array
   */
  abstract collect<T> (input: PipelineStage<T>): PipelineStage<T[]>

  /**
   * Returns a PipelineStage that emits all items emitted by the source PipelineStage that are distinct by comparison from previous items.
   * @param  input - Input PipelineStage
   * @param  selector - Optional function to select which value you want to check as distinct.
   * @return A PipelineStage that emits items from the source PipelineStage with distinct values.
   */
  distinct<T, K> (input: PipelineStage<T>, selector?: (value: T) => T | K): PipelineStage<T> {
    if (isUndefined(selector)) {
      selector = identity
    }
    return this.flatMap(this.collect(input), (values: T[]) => uniqBy(values, selector!))
  }

  /**
   * Emits only the first value (or the first value that meets some condition) emitted by the source PipelineStage.
   * @param  input - Input PipelineStage
   * @return A PipelineStage of the first item that matches the condition.
   */
  first<T> (input: PipelineStage<T>): PipelineStage<T> {
    return this.limit(input, 1)
  }

  /**
   * Returns a PipelineStage that emits the items you specify as arguments after it finishes emitting items emitted by the source PipelineStage.
   * @param  input  - Input PipelineStage
   * @param  values - Values to append
   * @return A PipelineStage that emits the items emitted by the source PipelineStage and then emits the additional values.
   */
  endWith<T> (input: PipelineStage<T>, values: T[]): PipelineStage<T> {
    return this.merge(input, this.from(values))
  }

  /**
   * Perform a side effect for every emission on the source PipelineStage, but return a PipelineStage that is identical to the source.
   * @param  input - Input PipelineStage
   * @param  cb    - Callback invoked on each item
   * @return A PipelineStage identical to the source, but runs the specified PipelineStage or callback(s) for each item.
   */
  tap<T> (input: PipelineStage<T>, cb: (value: T) => void): PipelineStage<T> {
    return this.map(input, (value: T) => {
      cb(value)
      return value
    })
  }

  /**
   * Find the smallest value produced by a pipeline of iterators.
   * It takes a ranking function as input, which is invoked with (x, y)
   * and must returns True if x < y and False otherwise.
   * Warning: this function needs to materialize all values of the pipeline.
   * @param  input - Input PipelineStage
   * @param  comparator - (optional) Ranking function
   * @return A pipeline stage that emits the lowest value found
   */
  min<T> (input: PipelineStage<T>, ranking?: (x: T, y: T) => boolean): PipelineStage<T> {
    if (isUndefined(ranking)) {
      ranking = (x: T, y: T) => x < y
    }
    return this.map(this.collect(input), (values: T[]) => {
      let minValue = values[0]
      for (let i = 1; i < values.length - 1; i++) {
        if (ranking!(values[i], minValue)) {
          minValue = values[i]
        }
      }
      return minValue
    })
  }

  /**
   * Find the smallest value produced by a pipeline of iterators.
   * It takes a ranking function as input, which is invoked with (x, y)
   * and must returns True if x > y and False otherwise.
   * Warning: this function needs to materialize all values of the pipeline.
   * @param  input - Input PipelineStage
   * @param  comparator - (optional) Ranking function
   * @return A pipeline stage that emits the highest value found
   */
  max<T> (input: PipelineStage<T>, ranking?: (x: T, y: T) => boolean): PipelineStage<T> {
    if (isUndefined(ranking)) {
      ranking = (x: T, y: T) => x > y
    }
    return this.map(this.collect(input), (values: T[]) => {
      let maxValue = values[0]
      for (let i = 1; i < values.length - 1; i++) {
        if (ranking!(values[i], maxValue)) {
          maxValue = values[i]
        }
      }
      return maxValue
    })
  }

  /**
   * Groups the items produced by a pipeline according to a specified criterion,
   * and emits the resulting groups
   * @param  input - Input PipelineStage
   * @param  keySelector - A function that extracts the grouping key for each item
   * @param  elementSelector - (optional) A function that transforms items before inserting them in a group
   */
  groupBy<T, K, R> (input: PipelineStage<T>, keySelector: (value: T) => K, elementSelector?: (value: T) => R): PipelineStage<[K, R[]]> {
    if (isUndefined(elementSelector)) {
      elementSelector = identity
    }
    const groups: Map<K, R[]> = new Map()
    let stage: PipelineStage<SubGroup<K, R>> = this.map(input, value => {
      return {
        key: keySelector(value),
        value: elementSelector!(value)
      }
    })
    return this.mergeMap(this.collect(stage), (subgroups: SubGroup<K, R>[]) => {
      // build groups
      subgroups.forEach(g => {
        if (!groups.has(g.key)) {
          groups.set(g.key, [ g.value ])
        } else {
          groups.set(g.key, groups.get(g.key)!.concat([g.value]))
        }
      })
      // inject groups into the pipeline
      return this.fromAsync(input => {
        groups.forEach((value, key) => input.next([key, value]))
      })
    })
  }

  /**
   * Peek values from the input pipeline stage, and use them to decide
   * between two candidate pipeline stages to continue the pipeline.
   * @param input - Input pipeline stage
   * @param count - How many items to peek from the input?
   * @param predicate - Predicate function invoked with the values
   * @param ifCase - Callback invoked if the predicate function evaluates to True
   * @param elseCase - Callback invoked if the predicate function evaluates to False
   * @return A pipeline stage
   */
  peekIf<T, O> (input: PipelineStage<T>, count: number, predicate: (values: T[]) => boolean, ifCase: (values: T[]) => PipelineStage<O>, elseCase: (values: T[]) => PipelineStage<O>): PipelineStage<O> {
    const peekable = this.limit(this.clone(input), count)
    return this.mergeMap(this.collect(peekable), values => {
      if (predicate(values)) {
        return ifCase(values)
      }
      return elseCase(values)
    })
  }
}
