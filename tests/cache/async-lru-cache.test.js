/* file: async-lru-cache-test.js
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

import { expect } from 'chai'
import { beforeEach, describe, it } from 'vitest'
import { AsyncLRUCache } from '../../src/engine/cache/cache-base'

describe('AsyncLRUCache', async () => {
  let cache = null
  beforeEach(() => {
    cache = new AsyncLRUCache(Infinity, Infinity)
  })

  describe('#update/commit', async () => {
    it('should supports insertion of items over time', async () => {
      const writerID = 1
      cache.update(1, 1, writerID)
      cache.update(1, 2, writerID)
      cache.update(1, 3, writerID)
      cache.commit(1, writerID)
      const content = await cache.get(1)
      expect(content).to.deep.equals([1, 2, 3])
    })

    it('should supports concurrent insertions of items from distinct writers', async () => {
      const firstID = 1
      const secondID = 2
      cache.update(1, 1, firstID)
      cache.update(1, '1', secondID)
      cache.update(1, 2, firstID)
      cache.update(1, '2', secondID)
      cache.update(1, '3', secondID)
      cache.update(1, 3, firstID)
      cache.update(1, '4', secondID)
      cache.commit(1, secondID)
      cache.commit(1, firstID)
      const content = await cache.get(1)
      expect(content).to.deep.equals([1, 2, 3])
    })
  })


  describe('#has', () => {
    it('should returns true when the cache entry is available', () => {
      const writerID = 1
      cache.update(1, 1, writerID)
      cache.update(1, 2, writerID)
      cache.update(1, 3, writerID)
      cache.commit(1, writerID)
      expect(cache.has(1)).to.deep.equals(true)
    })

    it('should returns false when the cache entry is not available', () => {
      const writerID = 1
      expect(cache.has(1)).to.deep.equals(false)
      cache.update(1, 1, writerID)
      cache.commit(1, writerID)
      expect(cache.has(1)).to.deep.equals(true)
    })
  })

  describe('#get', () => {
    it('should returns null when the key is not in the cache', () => {
      expect(cache.get(1)).to.deep.equals(null)
    })

    it('should delay execution until the cache entry is committed', async () => {
      const writerID = 1
      cache.update(1, 1, writerID)
      const contentPromise = cache.get(1)
      cache.update(1, 2, writerID)
      cache.commit(1, writerID)
      expect(await contentPromise).to.deep.equals([1, 2])
    })
  })

  describe('#delete', () => {
    it('should delete items inserted into the cache', () => {
      const writerID = 1
      cache.update(1, 1, writerID)
      expect(cache.has(1)).to.deep.equals(true)
      cache.delete(1, writerID)
      expect(cache.has(1)).to.deep.equals(false)
    })

    it('should resolve get promises to an empty array when an uncommitted entry is deleted', async () => {
      const writerID = 1
      cache.update(1, 1, writerID)
      const content = cache.get(1)
      cache.delete(1, writerID)
      expect((await content).length).to.deep.equals(0)
    })
  })
})
