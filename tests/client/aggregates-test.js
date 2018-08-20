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
const { XSD } = require('../../src/utils.js').rdf
const { getDB, LevelGraphEngine } = require('../utils.js')

describe('SPARQL aggregates', () => {
  let engine = null
  before(done => {
    getDB('./tests/data/dblp.nt')
      .then(db => {
        engine = new LevelGraphEngine(db)
        done()
      })
  })

  after(done => engine._db.close(done))

  it('should evaluate simple SPARQL queries with GROUP BY', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?p (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    `
    const results = []

    const iterator = engine.execute(query)
    iterator.on('error', done)
    iterator.on('data', b => {
      expect(b).to.have.keys('?p', '?nbPreds')
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
          expect(b['?nbPreds']).to.equal(`"1"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).to.equal(`"5"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).to.equal(`"4"^^${XSD('integer')}`)
          break
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).to.equal(`"1"^^${XSD('integer')}`)
          break
        default:
          expect().fail(`Unexpected predicate found: ${b['?p']}`)
          break
      }
      results.push(b)
    })
    iterator.on('end', () => {
      expect(results.length).to.equal(4)
      done()
    })
  })

  it('should evaluate queries with SPARQL expressions in GROUP BY', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?p ?z (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p (5 * 2 AS ?z)
    `
    const results = []

    const iterator = engine.execute(query)
    iterator.on('error', done)
    iterator.on('data', b => {
      expect(b).to.have.keys('?p', '?nbPreds', '?z')
      expect(b['?z']).to.equal(`"10"^^${XSD('integer')}`)
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
          expect(b['?nbPreds']).to.equal(`"1"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).to.equal(`"5"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).to.equal(`"4"^^${XSD('integer')}`)
          break
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).to.equal(`"1"^^${XSD('integer')}`)
          break
        default:
          expect().fail(`Unexpected predicate found: ${b['?p']}`)
          break
      }
      results.push(b)
    })
    iterator.on('end', () => {
      expect(results.length).to.equal(4)
      done()
    })
  })

  it('should evaluate queries that mix aggregations and numeric operations', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?p (COUNT(?p) * 2 AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    `
    const results = []

    const iterator = engine.execute(query)
    iterator.on('error', done)
    iterator.on('data', b => {
      expect(b).to.have.keys('?p', '?nbPreds')
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
          expect(b['?nbPreds']).to.equal(`"2"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).to.equal(`"10"^^${XSD('integer')}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).to.equal(`"8"^^${XSD('integer')}`)
          break
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).to.equal(`"2"^^${XSD('integer')}`)
          break
        default:
          expect().fail(`Unexpected predicate found: ${b['?p']}`)
          break
      }
      results.push(b)
    })
    iterator.on('end', () => {
      expect(results.length).to.equal(4)
      done()
    })
  })

  it('should evaluate aggregates with HAVING clauses', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?p (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    HAVING (COUNT(?p) > 1)
    `
    const results = []

    const iterator = engine.execute(query)
    iterator.on('error', done)
    iterator.on('data', b => {
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
    })
    iterator.on('end', () => {
      expect(results.length).to.equal(2)
      done()
    })
  })
}).timeout(20000)
