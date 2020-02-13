/* file: cache-base.ts
MIT License

Copyright (c) 2019-2020 Thomas Minier

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

import LRU from 'lru-cache'

interface AsyncCacheEntry<T, I> {
  content: Array<T>,
  writerID: I,
  isComplete: boolean
}

/**
 * A cache is a vue that materializes data for latter re-use
 * @author Thomas Minier
 */
export interface Cache<K, T> {
  /**
   * Put an item into the cache
   * @param key - Item's key
   * @param item - Item
   */
  put (key: K, item: T): void

  /**
   * Test if the cache contains an item with a given key
   * @param key - Item's key
   * @return True if the cache contains the item with the given key, False otherwise
   */
  has (key: K): boolean

  /**
   * Access an item by its key.
   * Each call to get() should be predated by a call to has(),
   * to check if the item is in the cache.
   * @param key - Item's key
   * @return The item with the given key, or null if it was not found
   */
  get (key: K): T | null

  /**
   * Remove an item from the cache
   * @param key - Item's key
   */
  delete (key: K): void

  /**
   * Get the number of items currently in the cache
   * @return The number of items currently in the cache
   */
  count (): number
}

/**
 * An async cache is cache which stores collections of items that are built over time.
 * Writers will call the update and commit method to update the cache content & mark items as available.
 * @author Thomas Minier
 */
export interface AsyncCache<K, T, I> {
  /**
   * Update an item into the cache
   * @param key - Item's key
   * @param item - Item
   * @param writerID - ID of the writer
   */
  update (key: K, item: T, writerID: I): void

  /**
   * Mark an item as available from the cache
   * @param key - Item's key
   * @param IwriterID - ID of the writer
   */
  commit (key: K, writerID: I): void

  /**
   * Test if the cache contains an item with a given key
   * @param key - Item's key
   * @return True if the cache contains the item with the given key, False otherwise
   */
  has (key: K): boolean

  /**
   * Access an item by its key.
   * Each call to get() should be predated by a call to has() to check if the item is in the cache.
   * @param key - Item's key
   * @return The values of the item with the given key, or null if it was not found
   */
  get (key: K): T[] | null

  /**
   * Remove an item from the cache
   * @param key - Item's key
   */
  delete (key: K, writerID: I): void

  /**
   * Get the number of items currently in the cache
   * @return The number of items currently in the cache
   */
  count (): number
}

/**
 * An in-memory LRU cache
 * @author Thomas Minier
 */
export class BaseLRUCache<K, T> implements Cache<K, T> {
  private readonly _content: LRU<K, T>

  constructor (maxSize: number, maxAge: number) {
    const options = {
      max: maxSize,
      maxAge
    }
    this._content = new LRU(options)
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
    this.delete(key)
  }

  count (): number {
    return this._content.itemCount
  }
}

/**
 * An in-memory LRU cache that supports async insertion of items
 * @author Thomas Minier
 */
export class AsyncLRUCache<K, T, I> implements AsyncCache<K, T, I> {
  private readonly _cache: BaseLRUCache<K, AsyncCacheEntry<T, I>>

  constructor (maxSize: number, maxAge: number) {
    this._cache = new BaseLRUCache(maxSize, maxAge)
  }

  has (key: K): boolean {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!
      return entry.isComplete
    }
    return false
  }

  update (key: K, item: T, writerID: I): void {
    if (this.has(key)) {
      const entry = this._cache.get(key)!
      if (entry.writerID === writerID) {
        entry.content.push(item)
        this._cache.put(key, entry)
      }
    } else {
      this._cache.put(key, {
        content: [item],
        writerID,
        isComplete: false
      })
    }
  }

  commit (key: K, writerID: I): void {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!
      if (entry.writerID === writerID) {
        entry.isComplete = true
        this._cache.put(key, entry)
      }
    }
  }

  get (key: K): T[] | null {
    if (this.has(key)) {
      return this._cache.get(key)!.content
    }
    return null
  }

  delete (key: K, writerID: I): void {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!
      if (entry.writerID === writerID) {
        this._cache.delete(key)
      }
    }
  }

  count (): number {
    return this._cache.count()
  }
}
