/* file : clear-test.js
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

const GRAPH_A_IRI = 'http://example.org#some-graph-a'
const GRAPH_B_IRI = 'http://example.org#some-graph-b'

describe('SPARQL UPDATE: CLEAR queries', () => {
  let engine = null
  beforeEach(() => {
    const gA = getGraph('./tests/data/dblp.nt')
    const gB = getGraph('./tests/data/dblp2.nt')
    engine = new TestEngine(gA, GRAPH_A_IRI)
    engine.addNamedGraph(GRAPH_B_IRI, gB)
  })

  const data = [
    {
      name: 'CLEAR DEFAULT',
      query: 'CLEAR DEFAULT',
      testFun: () => {
        const triples = engine._graph._store.getTriples()
        expect(triples.length).to.equal(0)
      }
    },
    {
      name: 'CLEAR ALL',
      query: 'CLEAR ALL',
      testFun: () => {
        let triples = engine._graph._store.getTriples()
        expect(triples.length).to.equal(0)
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples()
        expect(triples.length).to.equal(0)
      }
    },
    {
      name: 'CLEAR NAMED',
      query: 'CLEAR NAMED',
      testFun: () => {
        let triples = engine._graph._store.getTriples()
        expect(triples.length).to.not.equal(0)
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples()
        expect(triples.length).to.equal(0)
      }
    },
    {
      name: 'CLEAR GRAPH',
      query: `CLEAR GRAPH <${GRAPH_B_IRI}>`,
      testFun: () => {
        let triples = engine._graph._store.getTriples()
        expect(triples.length).to.not.equal(0)
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples()
        expect(triples.length).to.equal(0)
      }
    }
  ]

  data.forEach(d => {
    it(`should evaluate ${d.name} queries`, done => {
      engine.execute(d.query)
        .execute()
        .then(() => {
          d.testFun()
          done()
        })
        .catch(done)
    })
  })
})
