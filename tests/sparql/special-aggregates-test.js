/* file : special-aggregates-test.js
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

describe('Non standard SPARQL aggregates', () => {
  let engine = null
  before(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  const data = [
    {
      name: 'sea:ACCURACY',
      query: `
      PREFIX sea: <https://callidon.github.io/sparql-engine/aggregates#>
      SELECT (sea:ACCURACY(?x, ?y) AS ?acc) WHERE {
        { BIND(10 AS ?x) BIND(5 AS ?y) }
        UNION
        { BIND(10 AS ?x) BIND(10 AS ?y) }
      }
      GROUP BY ?x`,
      results: [
        {
          '?acc': '"0.5"^^http://www.w3.org/2001/XMLSchema#float'
        }
      ]
    },
  ]

  data.forEach(d => {
    it(`should evaluate the "${d.name}" SPARQL aggregate`, done => {
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
