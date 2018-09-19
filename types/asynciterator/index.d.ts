/* file : asynciterator.d.ts
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

declare module 'asynciterator' {
  /**
   * An asynchronous iterator provides pull-based access to a stream of objects.
   */
  export class AsyncIterator<T> {
    readonly readable: boolean;
    readonly closed: boolean;
    readonly ended: boolean;
    readonly destroyed: boolean;

    /**
     * Creates an iterator of natural numbers within the given range.
     * @param {number} start - The first number to emit
     * @param {number} nd - The last number to emit
     * @param {number} step - The increment between two numbers
     * @return {IntegerIterator} An iterator of natural numbers within the given range
     */
    static range (start: number, nd: number, step: number): IntegerIterator

    /**
     * Creates an iterator that wraps around a given iterator or readable stream.
     * Use this to convert an iterator-like object into a full-featured AsyncIterator.
     * @param {AsyncIterator} source - The source this iterator generates items from
     * @param {Object} options - Settings of the iterator
     * @return {AsyncIterator} A new iterator with the items from the given iterator
     */
    static wrap<T> (source: AsyncIterator<T>, options?: Object): AsyncIterator<T>

    /**
     * Called by AsyncIterator#destroy. Implementers can override this, but this should not be called directly.
     * @param {Error|null}  cause - The reason why the iterator is destroyed.
     * @param {function} callback - A callback function with an optional error argument.
     * @return {void}
     */
    _destroy(cause: Error | null, callback: () => void): void

    /**
     * Appends the items after those of the current iterator.
     * @param {I[]|AsyncIterator} items - Items to insert after this iterator's (remaining) items
     * @return {AsyncIterator} A new iterator that appends items to this iterator
     */
    append<I> (items: I[] | AsyncIterator<I>): AsyncIterator<T | I>;

    /**
     * Prepends the items after those of the current iterator.
     * @param {I[]|AsyncIterator} items - Items to insert before this iterator's (remaining) items
     * @return {AsyncIterator} A new iterator that prepends items to this iterator
     */
    prepend <I> (items: I[] | AsyncIterator<I>): AsyncIterator<T | I>;

    /**
     * Surrounds items of the current iterator with the given items.
     * @param {T[]|AsyncIterator} prepend - Items to insert before this iterator's (remaining) items
     * @param {T[]|AsyncIterator} append - Items to insert after this iterator's (remaining) items
     * @return {AsyncIterator} A new iterator that appends and prepends items to this iterator
     */
    surround <I, J> (prepend: I[] | AsyncIterator<I>, append: J[] | AsyncIterator<J>): AsyncIterator<T | I | J>;

    /**
     * Tries to read the next item from the iterator.
     * @return {T|null} The next item, or null if none is available
     */
    read (): T | null;

    /**
     * Limits the current iterator to the given number of items.
     * @param {number} count - The maximum number of items
     * @return {AsyncIterator<T>} A new iterator with at most the given number of items
     */
    take (count: number): AsyncIterator<T>;

    /**
     * Skips the given number of items from the current iterator.
     * @param {number} count - The number of items to skip
     * @return {AsyncIterator<T>} A new iterator that skips the given number of items
     */
    skip (count: number): AsyncIterator<T>;

    /**
     * Maps items from this iterator using the given function.
     * @param {function} mapper - A mapping function to call on this iterator's (remaining) items
     * @return {AsyncIterator<R>} A new iterator that maps the items from this iterator
     */
    map<R> (mapper: (item: T) => R | null): AsyncIterator<R>;

    /**
     * Return items from this iterator that match the filter.
     * @param {function} predicate - A filter function to call on this iterator's (remaining) items
     * @return {AsyncIterator<T>} A new iterator that filters items from this iterator
     */
    filter (predicate: (item: T) => boolean): AsyncIterator<T>;

    /**
     * Invokes the callback for each remaining item in the iterator.
     * @param {function} callback - A function that will be called with each item
     * @return {void}
     */
    each (callback: (item: T) => void): void;

    /**
     * Stops the iterator from generating new items.
     */
    close (): void;

    /**
     * Destroy the iterator and stop it from generating new items.
     * This will not do anything if the iterator was already ended or destroyed.
     * All internal resources will be released an no new items will be emitted, even not already generated items.
     * @param {Error} cause - An optional error to emit
     */
    destroy (cause?: Error): void;

    /**
     * Limits the current iterator to the given range.
     * @param {number} start - Index of the first item to return
     * @param {number} end - Index of the last item to return
     * @return {AsyncIterator} A new iterator with items in the given range
     */
    range (start: number, end: number): AsyncIterator<T>;

    /**
     * Creates a copy of the current iterator, containing all items emitted from this point onward.
     * Further copies can be created; they will all start from this same point. After this operation, only read the returned copies instead of the original iterator.
     * @return {AsyncIterator<T>} A new iterator that contains all future items of this iterator
     */
    clone (): AsyncIterator<T>;

    emit (event: string, ...args: any[]): void;
    on (event: string, callback: (value: any) => void): void;
  }

  /**
   * An iterator that enumerates integers in a certain range.
   */
  export class IntegerIterator extends AsyncIterator<number> {}

  /**
   * An iterator that doesn't emit any items.
   */
  export class EmptyIterator<T> extends AsyncIterator<T> {}

  /**
   * An iterator that copies items from another iterator.
   */
  export class ClonedIterator<T> extends AsyncIterator<T> {
    readonly _source: AsyncIterator<T>
    constructor (source: AsyncIterator<T>, options?: Object);
  }

  /**
   * An iterator that emits a single item.
   */
  export class SingletonIterator<T> extends AsyncIterator<T> {
    constructor (start: T);
  }

  /**
   * Utility function used to build a SingletonIterator
   */
  export function single<T> (start: T): SingletonIterator<T>;

  /**
   * A iterator that maintains an internal buffer of items.
   * This class serves as a base class for other iterators with a typically complex item generation process.
   */
  export class BufferedIterator<T> extends AsyncIterator<T> {
    readonly maxBufferSize: number;
    readonly eadable: boolean;

    constructor (options?: Object)
    /**
     * Fills the internal buffer until `this._maxBufferSize` items are present.
     */
    _fillBuffer(): void;

    /**
     * Tries to generate the given number of items.
     * @param {number} count - The number of items to generate
     * @param {function} done - To be called when reading is complete
     * @return {void}
     */
    _read (count: number, done: () => void): void;

    /**
     * Adds an item to the internal buffer.
     * @param {T|null} item - The item to add
     */
    _push (item: T | null): void;

    /**
     * Writes beginning items and opens iterator resources.
     * @param {function} done - To be called when initialization is complete
     * @return {void}
     */
    _begin(done: () => void): void;

    /**
     * Writes terminating items and closes iterator resources.
     * @param {function} done - To be called when termination is complete
     * @return {void}
     */
    _flush(done: () => void): void;
  }

  /**
   * An iterator that emits the items of a given array.
   */
  export class ArrayIterator<T> extends AsyncIterator<T> {
    constructor (array: T[], options?: Object);
  }

  /**
   * An iterator that generates items based on a source iterator.
   */
  export class TransformIterator<T,R> extends BufferedIterator<R> {
    source: AsyncIterator<T>
    constructor(source?: AsyncIterator<T>, options?: Object);
    _transform (item: T, done: () => void): void;
  }

  /**
   * An iterator that generates items by transforming each item of a source with a different iterator.
   */
  export class MultiTransformIterator<T,R> extends TransformIterator<T,R> {
    _createTransformer (item: T): AsyncIterator<R>;
  }
}
