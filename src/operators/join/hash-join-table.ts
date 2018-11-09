/* file : hash-table.ts
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

import { Bindings } from '../../rdf/bindings'

/**
 * A HashJoinTable is used by a Hash-based join to save set of bindings corresponding to a joinKey.
 * All bindings corresponding to the save value of the joinKey are aggregated in a list.
 */
export default class HashJoinTable {
  private readonly _content: Map<string, Bindings[]>
  constructor () {
    this._content = new Map()
  }

  /**
   * Register a pair (value, bindings).
   * @param key - Key used to save the bindings
   * @param bindings - Bindings to save
   */
  put (key: string, bindings: Bindings): void {
    if (!this._content.has(key)) {
      this._content.set(key, [])
    }
    const old: Bindings[] = this._content.get(key)!
    this._content.set(key, old.concat([bindings]))
  }

  /**
   * Perform a join between a set of bindings and all set of bindings in the table associated with the key.
   * Returns an empty list if there is no join results.
   * @param  key  - Key used to fetch set of set of bindings
   * @param  bindings - Bindings to join with
   * @return Join results, or an empty list if there is none.
   */
  join (key: string, bindings: Bindings): Bindings[] {
    if (!this._content.has(key)) {
      return []
    }
    return this._content.get(key)!.map((b: Bindings) => b.union(bindings))
  }
}
