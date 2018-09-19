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
     * @return {AsyncIterator<T>} A new iterator that maps the items from this iterator
     */
    map (mapper: (item: T) => T): AsyncIterator<T>;

    /**
     * Return items from this iterator that match the filter.
     * @param {function} predicate - A filter function to call on this iterator's (remaining) items
     * @return {AsyncIterator<T>} A new iterator that filters items from this iterator
     */
    filter (predicate: (item: T) => boolean): AsyncIterator<T>;

    /**
     * Stops the iterator from generating new items.
     */
    close (): void;

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
   * An iterator that doesn't emit any items.
   */
  export class EmptyIterator extends AsyncIterator<void> {}

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
     * @param {T} item - The item to add
     */
    _push (item: T): void;

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
  export class TransformIterator<T> extends BufferedIterator<T> {
    source: AsyncIterator<T>
    constructor(source?: AsyncIterator<T>, options?: Object);
    _transform (item: T, done: () => void): void;
  }

  /**
   * An iterator that generates items by transforming each item of a source with a different iterator.
   */
  export class MultiTransformIterator<T> extends TransformIterator<T> {
    _createTransformer (item: T): AsyncIterator<T>;
  }
}
