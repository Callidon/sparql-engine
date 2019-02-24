/* file : additional-operations-test.js
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
const { XSD } = require('../../dist/utils.js').rdf
const terms = require('../../dist/rdf-terms')
const { getGraph, TestEngine } = require('../utils.js')

function cloneLiteral(base, newValue) {
  switch (base.type) {
    case 'literal+type':
      return terms.TypedLiteralDescriptor(newValue, base.datatype)
    case 'literal+lang':
      return terms.LangLiteralDescriptor(newValue, base.lang)
    default:
      return terms.RawLiteralDescriptor(newValue)
  }
}

const customOperations = {
  'http://test.com#REVERSE': function (a) {
    return cloneLiteral(a, a.value.split("").reverse().join(""))
  }
}

describe('SPARQL custom operators', () => {
  let engine = null
  before(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g, null, customOperations)
  })

  it('should allow for custom operations', done => {
    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?reversed
    WHERE
    {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName> ?thomas .
      BIND(test:REVERSE(?thomas) as ?reversed) .
    }
    `
    const results = []
    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.keys('?reversed')
      expect(b['?reversed']).to.equal('"reiniM samohT"@en')
      results.push(b)
    }, done, () => {
      done()
    })
  })
})
