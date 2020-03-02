/* file : values-test.js
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
const { getGraph, TestEngine } = require('../utils.js')

describe('SPARQL VALUES', () => {
  let engine = null
  before(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  it('should evaluates VALUES clauses', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX esws: <https://dblp.org/rec/conf/esws/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
      VALUES ?article { esws:MinierSMV18a esws:MinierMSM17 }
    }`
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.all.keys('?name', '?article')
      expect(b['?article']).to.be.oneOf([
        'https://dblp.org/rec/conf/esws/MinierMSM17',
        'https://dblp.org/rec/conf/esws/MinierSMV18a'
      ])
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(2)
      done()
    })
  })

  it('should evaluates VALUES clauses mixed with Property Paths', done => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX esws: <https://dblp.org/rec/conf/esws/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    SELECT ?author ?article WHERE {
      ?author owl:sameAs/dblp-rdf:authorOf ?article .
      VALUES ?article { esws:MinierSMV18a esws:MinierMSM17 }
    }`
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.all.keys('?author', '?article')
      expect(b['?author']).to.equal('https://dblp.uni-trier.de/pers/m/Minier:Thomas')
      expect(b['?article']).to.be.oneOf([
        'https://dblp.org/rec/conf/esws/MinierMSM17',
        'https://dblp.org/rec/conf/esws/MinierSMV18a'
      ])
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(2)
      done()
    })
  })
})
