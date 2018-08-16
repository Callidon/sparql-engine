/* file : graph-test.js
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
const { getDB, LevelGraphEngine } = require('../utils.js')

const GRAPH_IRI = 'http://example.org#some-graph'

describe('GRAPH queries', () => {
  let engine = null
  before(done => {
    getDB('./tests/data/dblp.nt')
      .then(db => {
        engine = new LevelGraphEngine(db)
        engine.addNamedGraph(GRAPH_IRI, db)
        done()
      })
  })

  after(done => engine._db.close(done))

  it('should evaluate simple SPARQL GRAPH queries', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      GRAPH <${GRAPH_IRI}> {
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }
    }`
    let expectedArticles = [
      'https://dblp.org/rec/conf/esws/MinierSMV18a',
      'https://dblp.org/rec/conf/esws/MinierSMV18',
      'https://dblp.org/rec/journals/corr/abs-1806-00227',
      'https://dblp.org/rec/conf/esws/MinierMSM17',
      'https://dblp.org/rec/conf/esws/MinierMSM17a'
    ]
    const results = []

    const iterator = engine.execute(query)
    iterator.on('error', done)
    iterator.on('data', b => {
      expect(b).to.have.all.keys(['?name', '?article'])
      expect(b['?name']).to.equal('"Thomas Minier"@en')
      expect(b['?article']).to.be.oneOf(expectedArticles)
      expectedArticles = expectedArticles.filter(a => a !== b['?article'])
      results.push(b)
    })
    iterator.on('end', () => {
      expect(results.length).to.equal(5)
      expect(expectedArticles.length).to.equal(0)
      done()
    })
  })

  it('should evaluate SPARQL GRAPH queries when the Graph IRI is a variable', done => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article ?graph WHERE {
      ?s rdf:type dblp-rdf:Person .
      GRAPH ?graph {
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }
    }`
    let expectedArticles = [
      'https://dblp.org/rec/conf/esws/MinierSMV18a',
      'https://dblp.org/rec/conf/esws/MinierSMV18a',
      'https://dblp.org/rec/conf/esws/MinierSMV18',
      'https://dblp.org/rec/conf/esws/MinierSMV18',
      'https://dblp.org/rec/journals/corr/abs-1806-00227',
      'https://dblp.org/rec/journals/corr/abs-1806-00227',
      'https://dblp.org/rec/conf/esws/MinierMSM17',
      'https://dblp.org/rec/conf/esws/MinierMSM17',
      'https://dblp.org/rec/conf/esws/MinierMSM17a',
      'https://dblp.org/rec/conf/esws/MinierMSM17a'
    ]
    let nbDefault = 0
    let nbNamedGraph = 0
    const results = []

    const iterator = engine.execute(query)
    iterator.on('error', done)
    iterator.on('data', b => {
      expect(b).to.have.all.keys(['?name', '?article', '?graph'])
      expect(b['?graph']).to.be.oneOf(['urn:sparql-engine:DefaultGraph', GRAPH_IRI])
      if (b['?graph'] === 'urn:sparql-engine:DefaultGraph') {
        nbDefault++
      } else {
        nbNamedGraph++
      }
      expect(b['?name']).to.equal('"Thomas Minier"@en')
      expect(b['?article']).to.be.oneOf(expectedArticles)
      const index = expectedArticles.findIndex(v => v === b['?article'])
      expectedArticles.splice(index, 1)
      results.push(b)
    })
    iterator.on('end', () => {
      expect(results.length).to.equal(10)
      expect(expectedArticles.length).to.equal(0)
      expect(nbDefault).to.equal(5)
      expect(nbNamedGraph).to.equal(5)
      done()
    })
  })
}).timeout(20000)
