/* file : shjoin-test.js
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

'use strict'

const expect = require('chai').expect
const { from } = require('rxjs')
const { BindingBase } = require('../../dist/api.js')
const symHashJoin = require('../../dist/operators/join/shjoin.js').default

describe('Symmetric Hash Join operator', () => {
  it('should perform a join between two sources of bindings', done => {
    let nbResults = 0
    let nbEach = new Map()
    nbEach.set('http://example.org#toto', 0)
    nbEach.set('http://example.org#titi', 0)
    nbEach.set('http://example.org#tata', 0)
    const left = from([
      BindingBase.fromObject({'?x': 'http://example.org#toto'}),
      BindingBase.fromObject({'?x': 'http://example.org#titi'})
    ])
    const right = from([
      BindingBase.fromObject({'?x': 'http://example.org#toto', '?y': '"1"'}),
      BindingBase.fromObject({'?x': 'http://example.org#toto', '?y': '"2"'}),
      BindingBase.fromObject({'?x': 'http://example.org#toto', '?y': '"3"'}),
      BindingBase.fromObject({'?x': 'http://example.org#titi', '?y': '"4"'}),
      BindingBase.fromObject({'?x': 'http://example.org#tata', '?y': '"5"'})
    ])

    const op = symHashJoin('?x', left, right)
    op.subscribe(value => {
      expect(value.toObject()).to.have.all.keys('?x', '?y')
      switch (value.get('?x')) {
        case 'http://example.org#toto':
          expect(value.get('?y')).to.be.oneOf([ '"1"', '"2"', '"3"' ])
          nbEach.set('http://example.org#toto', nbEach.get('http://example.org#toto') + 1)
          break
        case 'http://example.org#titi':
          expect(value.get('?y')).to.be.oneOf([ '"4"' ])
          nbEach.set('http://example.org#titi', nbEach.get('http://example.org#titi') + 1)
          break
        default:
          throw new Error(`Unexpected "?x" value: ${value.get('?x')}`)
      }
      nbResults++
    }, done, () => {
      expect(nbResults).to.equal(4)
      expect(nbEach.get('http://example.org#toto')).to.equal(3)
      expect(nbEach.get('http://example.org#titi')).to.equal(1)
      done()
    })
  })
})
