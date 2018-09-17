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
  export class AsyncIterator {
    readonly readable: boolean;
    readonly closed: boolean;
    readonly ended: boolean;

    _fillBuffer(): void;
    _begin(done: () => void): void;
    _flush(done: () => void): void;
    emit (event: string, ...args: any[]): void;
    on (event: string, callback: (value: any) => void): void;
    read (count?: number): any;
    take (count: number): AsyncIterator;
    skip (count: number): AsyncIterator;
    map (mapper: (item: any) => any): AsyncIterator;
    filter (predicate: (item: any) => boolean): AsyncIterator;
    close (): void;
    clone (): AsyncIterator;
  }

  export class EmptyIterator extends AsyncIterator {}

  export class ClonedIterator extends AsyncIterator {
    readonly _source: AsyncIterator
  }

  export class SingletonIterator extends AsyncIterator {
    constructor (start: any);
  }

  export function single (start: any): SingletonIterator;

  export class BufferedIterator extends AsyncIterator {
    constructor (options?: Object)
    _read (count: number, done: () => void): void;
    _push (item: any): void;
  }

  export class ArrayIterator extends AsyncIterator {
    constructor (array: any[], options?: Object);
  }

  export class TransformIterator extends BufferedIterator {
    source: AsyncIterator
    constructor(source?: AsyncIterator, options?: Object);
    _transform (item: any, done: () => void): void;
  }

  export class MultiTransformIterator extends TransformIterator {
    _createTransformer (item: any): AsyncIterator;
  }
}
