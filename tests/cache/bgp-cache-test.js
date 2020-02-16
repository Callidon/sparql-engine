/* file: bgp-cache-test.js
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

const expect = require('chai').expect
const { LRUBGPCache } = require('../../dist/engine/cache/bgp-cache')
const { BindingBase } = require('../../dist/api.js')

describe('LRUBGPCache', () => {
  let cache = null
  beforeEach(() => {
    cache = new LRUBGPCache(Infinity, Infinity)
  })

  describe('#update/commit', () => {
    it('should supports insertion of items over time', done => {
      const writerID = 1
      const bgp = [ { subject: '?s', predicate: 'rdf:type', object: '?type' } ]
      const bindings = [
        BindingBase.fromObject({ '?s': ':s1', '?type': ':c1' }),
        BindingBase.fromObject({ '?s': ':s2', '?type': ':c2' })
      ]
      cache.update(bgp, bindings[0], writerID)
      cache.update(bgp, bindings[1], writerID)
      cache.commit(bgp, writerID)
      cache.get(bgp).then(content => {
        expect(content.map(x => x.toObject())).to.deep.equals(bindings.map(x => x.toObject()))
        done()
      }).catch(done)
    })
  })

  describe('#findSubset', () => {
    it('should find a subset for a Basic Graph Pattern which is partially in the cache', () => {
      // populate cache
      const subsetBGP = [ { subject: '?s', predicate: 'rdf:type', object: '?type'} ]
      cache.update(subsetBGP, BindingBase.fromObject({ '?s': ':s1' }), 1)
      cache.commit(subsetBGP, 1)
      // search for subset
      const bgp = [ 
        { subject: '?s', predicate: 'rdf:type', object: '?type'},
        { subject: '?s', predicate: 'foaf:name', object: '?name'}
      ]
      const [computedSubset, computedMissing] = cache.findSubset(bgp)
      expect(computedSubset).to.deep.equals(subsetBGP)
      expect(computedMissing).to.deep.equals([ bgp[1] ])
    })

    it('should find an empty subset for a Basic Graph Pattern with no valid subset in the cache', () => {
      // populate cache
      const subsetBGP = [ { subject: '?s', predicate: 'rdf:type', object: '?type'} ]
      cache.update(subsetBGP, BindingBase.fromObject({ '?s': ':s1' }), 1)
      cache.commit(subsetBGP, 1)
      // search for subset
      const bgp = [ 
        { subject: '?s', predicate: 'foaf:knows', object: '?type' },
        { subject: '?s', predicate: 'foaf:name', object: '?name' }
      ]
      const [computedSubset, computedMissing] = cache.findSubset(bgp)
      expect(computedSubset.length).to.equals(0)
      expect(computedMissing).to.deep.equals(bgp)
    })

    it('should find the largest subset from the cache entry', () => {
      // populate cache
      const subsetBGP_a = [ { subject: '?s', predicate: 'rdf:type', object: '?type'} ]
      const subsetBGP_b = [ 
        { subject: '?s', predicate: 'rdf:type', object: '?type' },
        { subject: '?s', predicate: 'foaf:name', object: '?name' }
      ]
      cache.update(subsetBGP_a, BindingBase.fromObject({ '?s': ':s1' }), 1)
      cache.commit(subsetBGP_a, 1)
      cache.update(subsetBGP_b, BindingBase.fromObject({ '?s': ':s2' }), 1)
      cache.commit(subsetBGP_b, 1)
      // search for subset
      const bgp = [ 
        { subject: '?s', predicate: 'rdf:type', object: '?type' },
        { subject: '?s', predicate: 'foaf:knows', object: '?type' },
        { subject: '?s', predicate: 'foaf:name', object: '?name' }
      ]
      const [computedSubset, computedMissing] = cache.findSubset(bgp)
      expect(computedSubset).to.deep.equals(subsetBGP_b)
      expect(computedMissing).to.deep.equals([ bgp[1] ])
    })
  })
})
