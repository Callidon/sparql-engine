/* file : aggregates-test.js
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

import { beforeAll, describe, expect, it } from 'vitest'
import { rdf } from '../../src/utils'
import { TestEngine, getGraph } from '../utils.js'

describe('SPARQL aggregates', () => {
  let engine = null
  beforeAll(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  it('should evaluate simple SPARQL queries with GROUP BY', async () => {
    const query = `
    SELECT ?p (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    `
    const results = await engine.execute(query).toArray()
    results.forEach(b => {
      b = b.toObject()
      expect(b).to.have.keys('?p', '?nbPreds')
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).toBe(`"1"^^${rdf.XSD.integer.value}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).toBe(`"5"^^${rdf.XSD.integer.value}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).toBe(`"4"^^${rdf.XSD.integer.value}`)
          break
        default:
          throw Error(`Unexpected predicate found: ${b['?p']}`)
      }

    })
    expect(results.length).to.equal(4)

  })


  it('should evaluate queries with SPARQL expressions in GROUP BY', async () => {
    const query = `
    SELECT ?p ?z (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p (5 * 2 AS ?z)
    `
    const results = await engine.execute(query).toArray()
    results.forEach(b => {
      b = b.toObject()
      expect(b).to.have.keys('?p', '?nbPreds', '?z')
      expect(b['?z']).toBe(`"10"^^${rdf.XSD.integer.value}`)
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).toBe(`"1"^^${rdf.XSD.integer.value}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).toBe(`"5"^^${rdf.XSD.integer.value}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).toBe(`"4"^^${rdf.XSD.integer.value}`)
          break
        default:
          throw new Error(`Unexpected predicate found: ${b['?p']}`)
      }

    })
    expect(results.length).to.equal(4)

  })


  it('should allow aggregate queries without a GROUP BY clause', async () => {
    const query = `
    SELECT (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }`

    const results = await engine.execute(query).toArray()
    results.forEach(b => {
      b = b.toObject()
      expect(b).to.have.keys('?nbPreds')
      expect(b['?nbPreds']).toBe(`"11"^^${rdf.XSD.integer.value}`)
    })
    expect(results).toHaveLength(1)

  })


  it('should evaluate queries that mix aggregations and numeric operations', async () => {
    const query = `
    SELECT ?p (COUNT(?p) * 2 AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    `
    const results = await engine.execute(query).toArray()
    results.forEach(b => {
      b = b.toObject()
      expect(b).to.have.keys('?p', '?nbPreds')
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName':
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
          expect(b['?nbPreds']).toBe(`"2"^^${rdf.XSD.integer.value}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).toBe(`"10"^^${rdf.XSD.integer.value}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).toBe(`"8"^^${rdf.XSD.integer.value}`)
          break
        default:
          throw new Error(`Unexpected predicate found: ${b['?p']}`)
          break
      }

    })
    expect(results.length).to.equal(4)

  })


  it('should evaluate aggregates with HAVING clauses', async () => {
    const query = `
    SELECT ?p (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    HAVING (COUNT(?p) > 1)
    `
    const results = await engine.execute(query).toArray()
    results.forEach(b => {
      b = b.toObject()
      expect(b).to.have.keys('?p', '?nbPreds')
      switch (b['?p']) {
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
          expect(b['?nbPreds']).toBe(`"5"^^${rdf.XSD.integer.value}`)
          break
        case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
          expect(b['?nbPreds']).toBe(`"4"^^${rdf.XSD.integer.value}`)
          break
        default:
          throw new Error(`Unexpected predicate found: ${b['?p']}`)
      }

    })
    expect(results.length).to.equal(2)

  })


  it('should evaluate aggregation queries with non-compatible UNION clauses', async () => {
    const query = `
    SELECT ?s (COUNT(?s) AS ?nbSubjects) WHERE {
      { ?s a ?o1 . } UNION { ?s a ?o2}
    }
    GROUP BY ?s
    `
    const results = await engine.execute(query).toArray()
    results.forEach(b => {
      b = b.toObject()
      expect(b).to.have.keys('?s', '?nbSubjects')
      expect(b['?s']).toBe('https://dblp.org/pers/m/Minier:Thomas')
      expect(b['?nbSubjects']).toBe(`"2"^^${rdf.XSD.integer.value}`)

    })
    expect(results.length).to.equal(1)

  })



  const data = [
    {
      name: 'COUNT-DISTINCT',
      query: `
      SELECT (COUNT(DISTINCT ?p) as ?count) WHERE {
        ?s ?p ?o
      }
      `,
      keys: ['?count'],
      nbResults: 1,
      testFun: function (b) {
        expect(b['?count']).toBe(`"10"^^${rdf.XSD.integer.value}`)
      }
    },
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
            expect(b['?sum']).toBe(`"10"^^${rdf.XSD.integer.value}`)
            break
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
            expect(b['?sum']).toBe(`"50"^^${rdf.XSD.integer.value}`)
            break
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
            expect(b['?sum']).toBe(`"40"^^${rdf.XSD.integer.value}`)
            break
          default:
            throw new Error(`Unexpected predicate found: ${b['?sum']}`)
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
        expect(b['?avg']).toBe(`"10"^^${rdf.XSD.integer.value}`)
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
        expect(b['?min']).toBe(`"10"^^${rdf.XSD.integer.value}`)
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
        expect(b['?max']).toBe(`"10"^^${rdf.XSD.integer.value}`)
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
            expect(b['?concat']).toBe('"10"')
            break
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf':
            expect(b['?concat']).toBe('"10.10.10.10.10"')
            break
          case 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith':
            expect(b['?concat']).toBe('"10.10.10.10"')
            break
          default:
            throw new Error(`Unexpected predicate found: ${b['?concat']}`)
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
        expect(b['?sample']).toBe(`"10"^^${rdf.XSD.integer.value}`)
      }
    }
  ]

  data.forEach(d => {
    it(`should evaluate the "${d.name}" aggregate`, async () => {
      const results = await engine.execute(d.query).toArray()
      results.forEach(b => {
        b = b.toObject()
        expect(b).to.have.keys(...d.keys)
        d.testFun(b)
      })
      expect(results).toHaveLength(d.nbResults)
    })
  })
})
