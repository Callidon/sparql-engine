/* file : bind-test.js
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

describe('SPARQL BIND', () => {
  let engine = null
  before(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  it('should evaluate a simple BIND clause', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      BIND ("Thomas Minier"@fr AS ?name)
    }`
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.all.keys('?s', '?name')
      expect(b['?name']).to.equal('"Thomas Minier"@fr')
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(1)
      done()
    })
  })

  it('should evaluate BIND clauses with complex SPARQL expressions', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      BIND (10 + 20 AS ?foo)
    }`
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.all.keys('?s', '?foo')
      expect(b['?foo']).to.equal('"30"^^http://www.w3.org/2001/XMLSchema#integer')
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(1)
      done()
    })
  })

  it('should evaluate chained BIND clauses', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      BIND ("Thomas Minier"@fr AS ?name)
      BIND (10 + 20 AS ?foo)
    }`
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.all.keys('?s', '?name', '?foo')
      expect(b['?name']).to.equal('"Thomas Minier"@fr')
      expect(b['?foo']).to.equal('"30"^^http://www.w3.org/2001/XMLSchema#integer')
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(1)
      done()
    })
  })

  it('should evaluate a BIND clause with the COALESCE function', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      BIND(COALESCE(?s, "toto") AS ?s2)
      BIND(COALESCE(?x, "Thomas Minier") AS ?name)
      BIND(COALESCE(?x, ?y) AS ?undefined)
    }`
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.all.keys('?s', '?s2', '?name', '?undefined')
      expect(b['?s2']).to.equal(b['?s'])
      expect(b['?name']).to.equal('"Thomas Minier"')
      expect(b['?undefined']).to.equal('"UNBOUND"')
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(1)
      done()
    })
  })
})
