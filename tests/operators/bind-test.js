/* file : bind.js
MIT License

Copyright (c) 2018-2020 Thomas Minier

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
const bind = require('../../dist/operators/bind.js').default

describe('Bind operator', () => {
  it('should bind results of valid SPARQL expression to a variable', done => {
    let nbResults = 0
    const source = from([
      BindingBase.fromObject({ '?x': '"1"^^http://www.w3.org/2001/XMLSchema#integer', '?y': '"2"^^http://www.w3.org/2001/XMLSchema#integer' }),
      BindingBase.fromObject({ '?x': '"2"^^http://www.w3.org/2001/XMLSchema#integer', '?y': '"3"^^http://www.w3.org/2001/XMLSchema#integer' })
    ])
    const expr = {
      type: 'operation',
      operator: '+',
      args: ['?x', '?y']
    }
    const op = bind(source, '?z', expr)
    op.subscribe(value => {
      expect(value.toObject()).to.have.all.keys('?x', '?y', '?z')
      if (value.get('?x').startsWith('"1"')) {
        expect(value.get('?z')).to.equal('"3"^^http://www.w3.org/2001/XMLSchema#integer')
      } else {
        expect(value.get('?z')).to.equal('"5"^^http://www.w3.org/2001/XMLSchema#integer')
      }
      nbResults++
    }, done, () => {
      expect(nbResults).to.equal(2)
      done()
    })
  })
})
