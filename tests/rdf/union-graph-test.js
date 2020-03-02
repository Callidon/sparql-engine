/* file : union-.js
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
const UnionGraph = require('../../dist/rdf/union-graph.js').default
const { getGraph } = require('../utils.js')

const GRAPH_A_IRI = 'http://example.org#some-graph-a'
const GRAPH_B_IRI = 'http://example.org#some-graph-b'

describe('Union Graph', () => {
  let gA = null
  let gB = null
  beforeEach(() => {
    gA = getGraph('./tests/data/dblp.nt')
    gA.iri = GRAPH_A_IRI
    gB = getGraph('./tests/data/dblp.nt')
    gB.iri = GRAPH_B_IRI
  })

  describe('#insert', done => {
    it('should evaluates insertion of the left-most graphs of the Union', done => {
      const union = new UnionGraph([gA, gB])
      const triple = {
        subject: 'http://example.org#toto',
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: 'http://example.org#Person'
      }
      union.insert(triple)
        .then(() => {
          // check triples have been inserted in gA and not gB
          let triples = gA._store.getTriples(triple.subject, triple.predicate, triple.object)
          expect(triples.length).to.equal(1)
          expect(triples[0].subject).to.equal(triple.subject)
          expect(triples[0].predicate).to.equal(triple.predicate)
          expect(triples[0].object).to.equal(triple.object)
          triples = gB._store.getTriples(triple.subject, triple.predicate, triple.object)
          expect(triples.length).to.equal(0)
          done()
        })
    })
  })

  describe('#delete', done => {
    it('should evaluates deletions on all graphs in the Union', done => {
      const union = new UnionGraph([gA, gB])
      const triple = {
        subject: 'https://dblp.org/pers/m/Minier:Thomas',
        predicate: 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf',
        object: 'https://dblp.org/rec/conf/esws/MinierSMV18a'
      }
      union.delete(triple)
        .then(() => {
          // check triples have been inserted in gA and not gB
          let triples = gA._store.getTriples(triple.subject, triple.predicate, triple.object)
          expect(triples.length).to.equal(0)
          triples = gB._store.getTriples(triple.subject, triple.predicate, triple.object)
          expect(triples.length).to.equal(0)
          done()
        })
    })
  })

  describe('#find', done => {
    it('should searches for RDF triples in all graphs', done => {
      const union = new UnionGraph([gA, gB])
      const triple = {
        subject: 'https://dblp.org/pers/m/Minier:Thomas',
        predicate: 'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf',
        object: '?article'
      }
      let nbResults = 0
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
      const iterator = union.find(triple)

      iterator.subscribe(b => {
        expect(b).to.have.all.keys(['subject', 'predicate', 'object'])
        expect(b.subject).to.equal(triple.subject)
        expect(b.predicate).to.equal(triple.predicate)
        expect(b.object).to.be.oneOf(expectedArticles)
        const index = expectedArticles.findIndex(v => v === b.object)
        expectedArticles.splice(index, 1)
        nbResults++
      }, done, () => {
        expect(nbResults).to.equal(10)
        expect(expectedArticles.length).to.equal(0)
        done()
      })
    })
  })
})
