/* file : aggregates-test.js
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
const { getGraph, TestEngine } = require('../utils.js')

describe('SPARQL aggregates', () => {
  let engine = null
  before(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  it('should evaluate simple SPARQL queries with GROUP BY', done => {
    const query = `
    SELECT ?p (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    `
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.keys('?p', '?nbPreds')
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).to.equal(`"1"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).to.equal(`"5"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).to.equal(`"4"^^${XSD('integer')}`)
          break
        default:
          expect().fail(`Unexpected predicate found: ${b['?p']}`)
          break
      }
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(4)
      done()
    })
  })

  it('should evaluate queries with SPARQL expressions in GROUP BY', done => {
    const query = `
    SELECT ?p ?z (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p (5 * 2 AS ?z)
    `
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.keys('?p', '?nbPreds', '?z')
      expect(b['?z']).to.equal(`"10"^^${XSD('integer')}`)
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).to.equal(`"1"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).to.equal(`"5"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).to.equal(`"4"^^${XSD('integer')}`)
          break
        default:
          expect().fail(`Unexpected predicate found: ${b['?p']}`)
          break
      }
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(4)
      done()
    })
  })

  it('should allow aggregate queries without a GROUP BY clause', done => {
    const query = `
    SELECT (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }`
    let nbResults = 0

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.keys('?nbPreds')
      expect(b['?nbPreds']).to.equal(`"11"^^${XSD('integer')}`)
      nbResults++
    }, done, () => {
      expect(nbResults).to.equal(1)
      done()
    })
  })

  it('should evaluate queries that mix aggregations and numeric operations', done => {
    const query = `
    SELECT ?p (COUNT(?p) * 2 AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    `
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.keys('?p', '?nbPreds')
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).to.equal(`"2"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).to.equal(`"10"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).to.equal(`"8"^^${XSD('integer')}`)
          break
        default:
          expect().fail(`Unexpected predicate found: ${b['?p']}`)
          break
      }
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(4)
      done()
    })
  })

  it('should evaluate aggregates with HAVING clauses', done => {
    const query = `
    SELECT ?p (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    HAVING (COUNT(?p) > 1)
    `
    const results = []

    const iterator = engine.execute(query)
    iterator.subscribe(b => {
      b = b.toObject()
      expect(b).to.have.keys('?p', '?nbPreds')
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).to.equal(`"5"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).to.equal(`"4"^^${XSD('integer')}`)
          break
        default:
          throw new Error(`Unexpected predicate found: ${b['?p']}`)
      }
      results.push(b)
    }, done, () => {
      expect(results.length).to.equal(2)
      done()
    })
  })

  const data = [
    {
      name: 'SUM',
      query: `
      SELECT ?p (SUM(?x) AS ?sum) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ['?p', '?sum'],
      nbResults: 4,
      testFun: function (b) {
        switch (b['?p']) {
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
          case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
            expect(b['?sum']).to.equal(`"10"^^${XSD('integer')}`)
            break
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
            expect(b['?sum']).to.equal(`"50"^^${XSD('integer')}`)
            break
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
            expect(b['?sum']).to.equal(`"40"^^${XSD('integer')}`)
            break
          default:
            expect().fail(`Unexpected predicate found: ${b['?sum']}`)
            break
        }
      }
    },
    {
      name: 'AVG',
      query: `
      SELECT ?p (AVG(?x) AS ?avg) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ['?p', '?avg'],
      nbResults: 4,
      testFun: function (b) {
        expect(b['?avg']).to.equal(`"10"^^${XSD('integer')}`)
      }
    },
    {
      name: 'MIN',
      query: `
      SELECT ?p (MIN(?x) AS ?min) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ['?p', '?min'],
      nbResults: 4,
      testFun: function (b) {
        expect(b['?min']).to.equal(`"10"^^${XSD('integer')}`)
      }
    },
    {
      name: 'MAX',
      query: `
      SELECT ?p (MAX(?x) AS ?max) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ['?p', '?max'],
      nbResults: 4,
      testFun: function (b) {
        expect(b['?max']).to.equal(`"10"^^${XSD('integer')}`)
      }
    },
    {
      name: 'GROUP_CONCAT',
      query: `
      SELECT ?p (GROUP_CONCAT(?x; separator=".") AS ?concat) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ['?p', '?concat'],
      nbResults: 4,
      testFun: function (b) {
        switch (b['?p']) {
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
          case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
            expect(b['?concat']).to.equal('"10"')
            break
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
            expect(b['?concat']).to.equal('"10.10.10.10.10"')
            break
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
            expect(b['?concat']).to.equal('"10.10.10.10"')
            break
          default:
            expect().fail(`Unexpected predicate found: ${b['?concat']}`)
            break
        }
      }
    },
    {
      name: 'SAMPLE',
      query: `
      SELECT ?p (SAMPLE(?x) AS ?sample) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ['?p', '?sample'],
      nbResults: 4,
      testFun: function (b) {
        expect(b['?sample']).to.equal(`"10"^^${XSD('integer')}`)
      }
    }
  ]

  data.forEach(d => {
    it(`should evaluate the "${d.name}" aggregate`, done => {
      const results = []
      const iterator = engine.execute(d.query)
      iterator.subscribe(b => {
        b = b.toObject()
        expect(b).to.have.keys(...d.keys)
        d.testFun(b)
        results.push(b)
      }, done, () => {
        expect(results.length).to.equal(d.nbResults)
        done()
      })
    })
  })
})
