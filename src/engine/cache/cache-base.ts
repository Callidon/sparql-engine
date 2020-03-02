/* file: cache-base.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import * as LRU from 'lru-cache'
import { Cache, AsyncCache } from './cache-interfaces'

/**
 * An in-memory LRU cache
 * @author Thomas Minier
 */
export class BaseLRUCache<K, T> implements Cache<K, T> {
  private readonly _content: LRU<K, T>

  /**
   * Constructor
   * @param maxSize - The maximum size of the cache
   * @param maxAge - Maximum age in ms
   * @param length - Function that is used to calculate the length of stored items
   * @param onDispose - Function that is called on items when they are dropped from the cache
   */
  constructor (maxSize: number, maxAge: number, length?: (item: T) => number, onDispose?: (key: K, item: T) => void) {
    const options = {
      max: maxSize,
      maxAge,
      length,
      dispose: onDispose
    }
    // if we set a dispose function, we need to turn 'noDisposeOnSet' to True,
    // otherwise onDispose will be called each time an item is updated (instead of when it slide out),
    // which will break any class extending BaseAsyncCache
    if (onDispose !== undefined) {
      options['noDisposeOnSet'] = true
    }
    this._content = new LRU<K, T>(options)
  }

  put (key: K, item: T): void {
    this._content.set(key, item)
  }

  has (key: K): boolean {
    return this._content.has(key)
  }

  get (key: K): T | null {
    if (this._content.has(key)) {
      return this._content.get(key)!
    }
    return null
  }

  delete (key: K): void {
    this._content.del(key)
  }

  count (): number {
    return this._content.itemCount
  }
}

/**
 * Data-structure used for the base implementation of an asynchronous cache.
 * @author Thomas Minier
 */
export interface AsyncCacheEntry<T, I> {
  /** The cache entry's content */
  content: Array<T>,
  /** The ID of the writer that is allowed to edit the cache entry */
  writerID: I,
  /** All reads that wait for this cache entry to be committed */
  pendingReaders: Array<(items: Array<T>) => void>,
  /** Whether the cache entry is availbale for read or not */
  isComplete: boolean
}

/**
 * A base class for implementing an asynchronous cache.
 * It simply needs to provides a data structure used to cache items
 * @author Thomas Minier
 */
export abstract class BaseAsyncCache<K, T, I> implements AsyncCache<K, T, I> {
  private readonly _cache: Cache<K, AsyncCacheEntry<T, I>>

  /**
   * Constructor
   */
  constructor (cacheInstance: Cache<K, AsyncCacheEntry<T, I>>) {
    this._cache = cacheInstance
  }

  has (key: K): boolean {
    return this._cache.has(key)
  }

  update (key: K, item: T, writerID: I): void {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!
      if (entry.writerID === writerID) {
        entry.content.push(item)
        this._cache.put(key, entry)
      }
    } else {
      this._cache.put(key, {
        content: [item],
        writerID,
        isComplete: false,
        pendingReaders: []
      })
    }
  }

  commit (key: K, writerID: I): void {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!
      if (entry.writerID === writerID) {
        // update cache entry ot marke it complete
        this._cache.put(key, {
          content: entry.content,
          writerID: entry.writerID,
          isComplete: true,
          pendingReaders: []
        })
        // resolve all pending readers
        entry.pendingReaders.forEach(resolve => resolve(entry.content))
      }
    }
  }

  get (key: K): Promise<T[]> | null {
    if (this.has(key)) {
      const entry = this._cache.get(key)!
      if (entry.isComplete) {
        return Promise.resolve(entry.content)
      }
      // wait until the entry is complete
      // all awaiting promises will be resolved by the commit or delete method
      return new Promise(resolve => {
        entry.pendingReaders.push(resolve)
      })
    }
    return null
  }

  delete (key: K, writerID: I): void {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!
      if (entry.writerID === writerID) {
        this._cache.delete(key)
        // resolve all pending readers with an empty result
        entry.pendingReaders.forEach(resolve => resolve([]))
      }
    }
  }

  count (): number {
    return this._cache.count()
  }
}

/**
 * An in-memory LRU implementation of an asynchronous cache.
 * @author Thomas Minier
 */
export class AsyncLRUCache<K, T, I> extends BaseAsyncCache<K, T, I> {
  /**
   * Constructor
   * @param maxSize - The maximum size of the cache
   * @param maxAge - Maximum age in ms
   * @param length - Function that is used to calculate the length of stored items
   * @param onDispose - Function that is called on items when they are dropped from the cache
   */
  constructor (maxSize: number, maxAge: number, length?: (item: AsyncCacheEntry<T, I>) => number, onDispose?: (key: K, item: AsyncCacheEntry<T, I>) => void) {
    super(new BaseLRUCache<K, AsyncCacheEntry<T, I>>(maxSize, maxAge, length, onDispose))
  }
}
