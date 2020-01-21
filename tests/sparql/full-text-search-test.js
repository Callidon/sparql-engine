/* file : full-text-search-test.js
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

describe('Full Text Search SPARQL queries', () => {
  let engine = null
  before(() => {
    const g = getGraph(['./tests/data/dblp.nt', './tests/data/dblp2.nt'])
    engine = new TestEngine(g)
  })

  const data = [
    {
      description: 'a simple full text search query',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?name ses:search "Minier".
      }`,
      results: [
        {
          '?s': 'https://dblp.org/pers/m/Minier:Thomas',
          '?name': '"Thomas Minier"@en'
        }
      ]
    },
    {
      description: 'a query with the ses:matchAllTerms parameter',
      query: `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?s WHERE {
        ?s rdfs:label ?label .
        ?label ses:search "RDF data Minier".
        ?label ses:matchAllTerms "true".
      }`,
      results: [
        {
          '?s': 'https://dblp.org/pers/m/Minier:Thomas.nt'
        }
      ]
    },
    {
      description: 'a query which includes the rank and the relevance score',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?name ses:search "Minier".
        ?name ses:relevance ?score .
        ?name ses:rank ?rank .
      }`,
      results: [
        {
          '?s': 'https://dblp.org/pers/m/Minier:Thomas',
          '?name': '"Thomas Minier"@en',
          '?score': '"0.5"^^http://www.w3.org/2001/XMLSchema#float',
          '?rank': '"0"^^http://www.w3.org/2001/XMLSchema#integer'
        }
      ]
    },
    {
      description: 'a query which a minimum relevance score',
      query: `
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?o ?score WHERE {
        ?s ?p ?o .
        ?o ses:search "Thomas Minier".
        ?o ses:relevance ?score .
        ?o ses:minRelevance "1" .
      }`,
      results: [
        {
          '?o': 'https://dblp.org/pers/m/Minier:Thomas',
          '?score': '"1"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
    {
      description: 'a query which minimum and maximum relevance scores',
      query: `
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?o ?score WHERE {
        ?s ?p ?o .
        ?o ses:search "Thomas Minier".
        ?o ses:relevance ?score .
        ?o ses:minRelevance "0.01" .
        ?o ses:maxRelevance "0.3" .
      }`,
      results: [
        {
          '?o': '"provenance information for RDF data of dblp person \'m/Minier:Thomas\'"',
          '?score': '"0.111"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
    {
      description: 'a query which a maximum rank',
      query: `
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?o ?score ?rank WHERE {
        ?s ?p ?o .
        ?o ses:search "Thomas Minier".
        ?o ses:relevance ?score .
        ?o ses:maxRank "2" .
        ?o ses:rank ?rank
      }`,
      results: [
        {
          '?o': 'https://dblp.org/pers/m/Minier:Thomas',
          '?score': '"1"^^http://www.w3.org/2001/XMLSchema#float',
          '?rank': '"0"^^http://www.w3.org/2001/XMLSchema#integer'
        },
        {
          '?o': '"Thomas Minier"@en',
          '?score': '"0.5"^^http://www.w3.org/2001/XMLSchema#float',
          '?rank': '"1"^^http://www.w3.org/2001/XMLSchema#integer'
        },
        {
          '?o': 'https://dblp.org/rec/conf/esws/MinierMSM17a',
          '?score': '"0.5"^^http://www.w3.org/2001/XMLSchema#float',
          '?rank': '"2"^^http://www.w3.org/2001/XMLSchema#integer'
        }
      ]
    },
    {
      description: 'a query which minimum and maximum ranks',
      query: `
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?o ?score ?rank WHERE {
        ?s ?p ?o .
        ?o ses:search "Thomas Minier".
        ?o ses:relevance ?score .
        ?o ses:minRank "1" .
        ?o ses:maxRank "2" .
        ?o ses:rank ?rank
      }`,
      results: [
        {
          '?o': '"Thomas Minier"@en',
          '?score': '"0.5"^^http://www.w3.org/2001/XMLSchema#float',
          '?rank': '"1"^^http://www.w3.org/2001/XMLSchema#integer'
        },
        {
          '?o': 'https://dblp.org/rec/conf/esws/MinierMSM17a',
          '?score': '"0.5"^^http://www.w3.org/2001/XMLSchema#float',
          '?rank': '"2"^^http://www.w3.org/2001/XMLSchema#integer'
        }
      ]
    },
  ]

  data.forEach(d => {
    it(`should evaluate ${d.description}`, done => {
      const results = []
      const iterator = engine.execute(d.query)
      iterator.subscribe(b => {
        results.push(b.toObject())
      }, done, () => {
        expect(results).to.deep.equals(d.results)
        done()
      })
    })
  })
})
