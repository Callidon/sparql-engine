/* file : special-functions-test.js
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

describe('Non standard SPARQL functions', () => {
  let engine = null
  before(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  const data = [
    {
      name: 'sef:cosh',
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:cosh(1) AS ?x)
      }`,
      results: [
        {
          '?x': '"1.5430806348152437"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
    {
      name: 'sef:sinh',
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:sinh(1) AS ?x)
      }`,
      results: [
        {
          '?x': '"1.1752011936438014"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
    {
      name: 'sef:tanh',
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:tanh(1) AS ?x)
      }`,
      results: [
        {
          '?x': '"0.7615941559557649"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
    {
      name: 'sef:coth',
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:coth(1) AS ?x)
      }`,
      results: [
        {
          '?x': '"1.3130352854993312"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
    {
      name: 'sef:sech',
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:sech(1) AS ?x)
      }`,
      results: [
        {
          '?x': '"0.6480542736638853"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
    {
      name: 'sef:csch',
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:csch(1) AS ?x)
      }`,
      results: [
        {
          '?x': '"0.8509181282393214"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
    {
      name: 'sef:strsplit',
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?y WHERE {
        BIND("Thomas Minier" AS ?x)
        BIND(sef:strsplit(?x, " ") AS ?y)
      }`,
      results: [
        {
          '?y': '"Thomas"'
        },
        {
          '?y': '"Minier"'
        }
      ]
    },
  ]

  data.forEach(d => {
    it(`should evaluate the "${d.name}" SPARQL function`, done => {
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
