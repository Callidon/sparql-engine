/* file : service-test.js
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

import { beforeEach, describe, expect, it } from 'vitest'
import { rdf } from '../../src/utils'
import { TestEngine, getGraph } from '../utils'


const GRAPH_A_IRI = rdf.createIRI('http://example.org#some-graph-a')
const GRAPH_B_IRI = rdf.createIRI('http://example.org#some-graph-b')

describe('SERVICE queries', () => {
  let engine = null
  let gA = null
  let gB = null
  beforeEach(() => {
    gA = getGraph('./tests/data/dblp.nt')
    gB = getGraph('./tests/data/dblp2.nt')
    engine = new TestEngine(gA, GRAPH_A_IRI)
    engine._dataset.setGraphFactory(iri => {
      if (iri.equals(GRAPH_B_IRI)) {
        return gB
      }
      return null
    })
  })

  const data = [
    {
      text: 'should evaluate simple SPARQL queries with literal values',
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?article WHERE {
            ?s rdf:type dblp-rdf:Person .
            ?s dblp-rdf:primaryFullPersonName "Thomas Minier"@en .
            ?s dblp-rdf:authorOf ?article .
          }`,
      nbResults: 5,
      testFun: function (b) {
        expect(b).to.have.all.keys(['?article'])
        expect(b['?article']).to.be.oneOf([
          'https://dblp.org/rec/conf/esws/MinierSMV18a',
          'https://dblp.org/rec/conf/esws/MinierSMV18',
          'https://dblp.org/rec/journals/corr/abs-1806-00227',
          'https://dblp.org/rec/conf/esws/MinierMSM17',
          'https://dblp.org/rec/conf/esws/MinierMSM17a'
        ])
      }
    },
    {
      text: 'should evaluate SPARQL queries where literal in BIND',
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?article WHERE {
        BIND("Thomas Minier"@en AS ?name)
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }`,
      nbResults: 5,
      testFun: function (b) {
        expect(b).to.have.all.keys(['?article'])
        expect(b['?article']).to.be.oneOf([
          'https://dblp.org/rec/conf/esws/MinierSMV18a',
          'https://dblp.org/rec/conf/esws/MinierSMV18',
          'https://dblp.org/rec/journals/corr/abs-1806-00227',
          'https://dblp.org/rec/conf/esws/MinierMSM17',
          'https://dblp.org/rec/conf/esws/MinierMSM17a'
        ])
      }
    },
    {
      text: 'should evaluate simple SPARQL queries with literal value in SERVICE clause',
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        SERVICE <${GRAPH_A_IRI.value}> {
          ?s dblp-rdf:primaryFullPersonName "Thomas Minier"@en .
        }
      }`,
      nbResults: 1,
      testFun: function (b) {
        expect(b).to.have.all.keys(['?s'])
        expect(b['?s']).to.be.oneOf([
          'https://dblp.org/pers/m/Minier:Thomas',
        ])
      }
    },
    {
      text: 'should evaluate SPARQL queries where literal in BIND for SERVICE clause',
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?s ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:authorOf ?article .
        SERVICE <${GRAPH_A_IRI.value}> {
          BIND("Thomas Minier"@en AS ?name)
          ?s dblp-rdf:primaryFullPersonName ?name .
        }
      }`,
      nbResults: 5,
      testFun: function (b) {
        expect(b).to.have.all.keys(['?s', '?article'])
        expect(b['?article']).to.be.oneOf([
          'https://dblp.org/rec/conf/esws/MinierSMV18a',
          'https://dblp.org/rec/conf/esws/MinierSMV18',
          'https://dblp.org/rec/journals/corr/abs-1806-00227',
          'https://dblp.org/rec/conf/esws/MinierMSM17',
          'https://dblp.org/rec/conf/esws/MinierMSM17a'
        ])
        expect(b['?s']).to.be.oneOf([
          'https://dblp.org/pers/m/Minier:Thomas',
        ])
      }
    }
  ]

  data.forEach(d => {
    it(d.text, async () => {
      const iterator = await engine.execute(d.query).toArray()
      iterator.forEach(b => {
        b = b.toObject()
        d.testFun(b)
      })
      expect(iterator).toHaveLength(d.nbResults)
    })
  })
})

