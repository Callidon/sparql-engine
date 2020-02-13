/* file: bgp-cache.ts
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

import { AsyncLRUCache, AsyncCache } from './cache-base'
import { Pipeline } from '../pipeline/pipeline'
import { PipelineStage } from '../pipeline/pipeline-engine'
import { Bindings } from '../../rdf/bindings'
import { Algebra } from 'sparqljs'
import { sparql } from '../../utils'

export default class BGPCache implements AsyncCache<Algebra.TripleObject[], Bindings, string> {
  private readonly _cache: AsyncLRUCache<string, Bindings, string>
  constructor (maxSize: number, maxAge: number) {
    this._cache = new AsyncLRUCache(maxSize, maxAge)
  }

  has (bgp: Algebra.TripleObject[]): boolean {
    return this._cache.has(sparql.hashBGP(bgp))
  }

  update (bgp: Algebra.TripleObject[], item: Bindings, writerID: string): void {
    this._cache.update(sparql.hashBGP(bgp), item, writerID)
  }

  get (bgp: Algebra.TripleObject[]): Bindings[] | null {
    return this._cache.get(sparql.hashBGP(bgp))
  }

  getAsPipeline (bgp: Algebra.TripleObject[]): PipelineStage<Bindings> {
    const bindings = this.get(bgp)
    if (bindings === null) {
      return Pipeline.getInstance().empty()
    }
    return Pipeline.getInstance().from(bindings.map(b => b.clone()))
  }

  commit (bgp: Algebra.TripleObject[], writerID: string): void {
    this._cache.commit(sparql.hashBGP(bgp), writerID)
  }

  delete (bgp: Algebra.TripleObject[], writerID: string): void {
    this._cache.delete(sparql.hashBGP(bgp), writerID)
  }

  count (): number {
    return this._cache.count()
  }
}
