/* file : additional-operations-test.js
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
const { rdf } = require('../../dist/api.js')
const { getGraph, TestEngine } = require('../utils.js')

describe('SPARQL custom operators', () => {

  it('should allow for custom functions in BIND', done => {

    const customFunctions = {
      'http://test.com#REVERSE': function (a) {        
        return rdf.shallowCloneTerm(a, a.value.split("").reverse().join(""))
      }
    }

    const g = getGraph('./tests/data/dblp.nt')
    const engine = new TestEngine(g, null, customFunctions)

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

  it('should allow for custom functions in FILTER', done => {

    const customFunctions = {
      'http://test.com#CONTAINS_THOMAS': function (a) {
        return rdf.createBoolean(a.value.toLowerCase().indexOf("thomas") >= 0)
      }
    }
    const g = getGraph('./tests/data/dblp.nt')
    const engine = new TestEngine(g, null, customFunctions)

    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?o
    WHERE
    {
      ?s ?p ?o . FILTER(test:CONTAINS_THOMAS(?o))
    }
    `
    const results = []
    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.keys('?o')
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(3)
      done()
    })
  })

  it('should allow for custom functions in HAVING', done => {

    const customFunctions = {
      'http://test.com#IS_EVEN': function (a) {
        const value = rdf.asJS(a.value, a.datatype.value)
        return rdf.createBoolean(value % 2 === 0)
      }
    }
    const g = getGraph('./tests/data/dblp.nt')
    const engine = new TestEngine(g, null, customFunctions)

    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?length
    WHERE
    {
      ?s ?p ?o .
      BIND (STRLEN(?o) as ?length)
    }
    GROUP BY ?length
    HAVING (test:IS_EVEN(?length))
    `
    const results = []
    const iterator = engine.execute(query)
    iterator.subscribe(b => {

      b = b.toObject()
      expect(b).to.have.keys('?length')
      const length = parseInt(b["?length"].split("^^")[0].replace(/"/g, ""))
      expect(length % 2).to.equal(0)

      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(8)
      done()
    })
  })

  it('should consider the solution "unbound" on an error, but query should continue continue', done => {

    const customFunctions = {
      'http://test.com#ERROR': function (a) {
        throw new Error("This should result in an unbould solution, but the query should still evaluate")
      }
    }

    const g = getGraph('./tests/data/dblp.nt')
    const engine = new TestEngine(g, null, customFunctions)


    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?error
    WHERE
    {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName> ?thomas .
      BIND(test:ERROR(?thomas) as ?error) .
    }
    `
    const results = []
    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.keys('?error')
      expect(b['?error']).to.equal('"UNBOUND"')
      results.push(b)
    }, done, () => {
      done()
    })
  })

  it('should fail if the custom function does not exist', done => {

    const g = getGraph('./tests/data/dblp.nt')
    const engine = new TestEngine(g)

    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?reversed
    WHERE
    {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName> ?thomas .
      BIND(test:REVERSE(?thomas) as ?reversed) .
    }
    `
    expect(() => engine.execute(query)).to.throw(Error)
    done()
  })

})
