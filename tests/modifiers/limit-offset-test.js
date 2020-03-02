/* file : limit-offset-test.js
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

describe('SPARQL queries with LIMIT/OFFSET', () => {
  let engine = null
  before(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  const data = [
    {
      text: 'should evaluate SPARQL queries with OFFSET',
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?name ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }
      OFFSET 2`,
      results: [
        'https://dblp.org/rec/conf/esws/MinierSMV18',
        'https://dblp.org/rec/conf/esws/MinierSMV18a',
        'https://dblp.org/rec/journals/corr/abs-1806-00227'
      ]
    },
    {
      text: 'should evaluate SPARQL queries with LIMIT',
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?name ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }
      LIMIT 2`,
      results: [
        'https://dblp.org/rec/conf/esws/MinierMSM17',
        'https://dblp.org/rec/conf/esws/MinierMSM17a'
      ]
    },
    {
      text: 'should evaluate SPARQL queries with LIMIT & OFFSET',
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?name ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }
      OFFSET 3
      LIMIT 2`,
      results: [
        'https://dblp.org/rec/conf/esws/MinierSMV18',
        'https://dblp.org/rec/conf/esws/MinierSMV18a'
      ]
    }
  ]

  data.forEach(d => {
    it(d.text, done => {
      const expectedCardinality = d.results.length
      let nbResults = 0
      const iterator = engine.execute(d.query)
      iterator.subscribe(b => {
        b = b.toObject()
        expect(b['?article']).to.be.oneOf(d.results)
        d.results.splice(d.results.indexOf(b['?article']), 1)
        nbResults++
      }, done, () => {
        expect(nbResults).to.equal(expectedCardinality)
        done()
      })
    })
  })
})
