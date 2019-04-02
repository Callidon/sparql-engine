/* file : pipeline-engine.ts
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

import { ObservableInput } from 'rxjs'

/**
 * A step in a pipeline. Data can be consumed in a pull-based or push-bashed fashion.
 * @author Thomas Minier
 */
export interface PipelineStage<T> {

  subscribe(onData: (value: T) => void, onError: (err: any) => void, onEnd: () => void): void;

  forEach(cb: (value: T) => void): void;
}

/**
 * Abstract representation of a pipeline of iterators.
 * Concrete subclasses are used by the fremwork to build the query execution pipeline.
 * @abstract
 * @author Thomas Minier
 */
export abstract class PipelineEngine<T, O extends PipelineStage<T>, B extends PipelineStage<T[]>> {

  /**
   * Creates a PipelineStage that emits no items
   * @return A PipelineStage that emits no items
   */
  abstract empty(): O;

  /**
   * Converts the arguments to a PipelineStage
   * @param  values - Values to convert
   * @return A PipelineStage that emits the values
   */
  abstract of(...values: T[]): O;

  /**
   * Creates a PipelineStage from an Array, an array-like object, a Promise, an iterable object, or an Observable-like object.
   * @param  value - Source object
   * @return A PipelineStage that emits the values contains in the object
   */
  abstract from(value: ObservableInput<T>): O;

  /**
   * Creates an output PipelineStage which concurrently emits all values from every given input PipelineStage.
   * @param  inputs - Inputs PipelineStage
   * @return Output PipelineStage
   */
  abstract merge(...inputs: O[]): O;

  /**
   * Applies a given `mapper` function to each value emitted by the source PipelineStage, and emits the resulting values as a PipelineStage.
   * @param  input  - Source PipelineStage
   * @param  mapper - The function to apply to each value emitted by the source PipelineStage
   * @return A PipelineStage that emits the values from the source PipelineStage transformed by the given `mapper` function.
   */
  abstract map(input: O, mapper: (value: T) => T): O;

  /**
   * Maps each source value to an array of values which is merged in the output PipelineStage.
   * @param  input  - Input PipelineStage
   * @param  mapper - Transformation function
   * @return Output PipelineStage
   */
  abstract flatMap(input: O, mapper: (value: T) => T[]): O;

  /**
   * Projects each source value to a PipelineStage which is merged in the output PipelineStage.
   * @param  input  - Input PipelineStage
   * @param  mapper - Transformation function
   * @return Output PipelineStage
   */
  abstract mergeMap(input: O, mapper: (value: T) => O): O;

  /**
   * Filter items emitted by the source PipelineStage by only emitting those that satisfy a specified predicate.
   * @param  input     - Input PipelineStage
   * @param  predicate - Predicate function
   * @return Output PipelineStage
   */
  abstract filter(input: O, predicate: (value: T) => boolean): O;

  /**
   * Applies an accumulator function over the source PipelineStage, and returns the accumulated result when the source completes, given an optional initial value.
   * @param  input   - Input PipelineStage
   * @param  reducer - Accumulator function
   * @return A PipelineStage that emits a single value that is the result of accumulating the values emitted by the source PipelineStage.
   */
  abstract reduce(input: O, reducer: (acc: T, value: T) => T, initial?: T): O;

  /**
   * Emits only the first `count` values emitted by the source PipelineStage.
   * @param  input - Input PipelineStage
   * @param  count - How many items to take
   * @return A PipelineStage that emits only the first count values emitted by the source PipelineStage, or all of the values from the source if the source emits fewer than count values.
   */
  abstract limit(input: O, count: number): O;

  /**
   * Returns a PipelineStage that skips the first count items emitted by the source PipelineStage.
   * @param  input  - Input PipelineStage
   * @param  count  - How many items to skip
   * @return A PipelineStage that skips values emitted by the source PipelineStage.
   */
  abstract skip(input: O, count: number): O;

  /**
   * Returns a PipelineStage that emits all items emitted by the source PipelineStage that are distinct by comparison from previous items.
   * @param  input - Input PipelineStage
   * @return A PipelineStage that emits items from the source PipelineStage with distinct values.
   */
  abstract distinct(input: O): O;

  /**
   * Apply a callback on every item emitted by the source PipelineStage
   * @param  input - Input PipelineStage
   * @param  cb    - Callback
   */
  abstract forEach(input: O, cb: (value: T) => void): void;

  /**
   * Emits a given value if the source PipelineStage completes without emitting any next value, otherwise mirrors the source PipelineStage.
   * @param  input        - Input PipelineStage
   * @param  defaultValue - The default value used if the source Observable is empty.
   * @return A PipelineStage that emits either the specified defaultValue if the source PipelineStage emits no items, or the values emitted by the source PipelineStage.
   */
  abstract defaultIfEmpty(input: O, defaultValue: T): O;

  /**
   * Buffers the source PipelineStage values until the size hits the maximum bufferSize given.
   * @param  input - Input PipelineStage
   * @param  count - The maximum size of the buffer emitted.
   * @return A PipelineStage of arrays of buffered values.
   */
  abstract bufferCount(input: O, count: number): B;

  /**
   * Collect all items from the source PipelineStage into an array.
   * @param  input - Input PipelineStage
   * @return All values emitted by the source PipelineStage as an array
   */
  abstract collect(input: O,): B;

  /**
   * Emits only the first value (or the first value that meets some condition) emitted by the source PipelineStage.
   * @param  input - Input PipelineStage
   * @return A PipelineStage of the first item that matches the condition.
   */
  first(input: O): O {
    return this.limit(input, 1)
  }

  /**
   * Returns a PipelineStage that emits the items you specify as arguments after it finishes emitting items emitted by the source PipelineStage.
   * @param  input  - Input PipelineStage
   * @param  values - Values to append
   * @return A PipelineStage that emits the items emitted by the source PipelineStage and then emits the items in the specified PipelineStage.
   */
  endWith(input: O, values: T[]): O {
    return this.merge(input, this.from(values))
  }

  /**
   * Perform a side effect for every emission on the source PipelineStage, but return a PipelineStage that is identical to the source.
   * @param  input - Input PipelineStage
   * @param  cb    - Callback invoked on each item
   * @return A PipelineStage identical to the source, but runs the specified PipelineStage or callback(s) for each item.
   */
  tap(input: O, cb: (value: T) => void): O {
    return this.map(input, (value: T) => {
      cb(value)
      return value
    })
  }
}
