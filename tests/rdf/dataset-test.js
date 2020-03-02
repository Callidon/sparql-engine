/* file : graph-test.js
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
const { Dataset, Graph, HashMapDataset } = require('../../dist/api.js')

describe('Dataset', () => {
  it('should enforce subclasses to implement a "setDefaultGraph" method', () => {
    const d = new Dataset()
    expect(() => d.setDefaultGraph()).to.throw(Error)
  })

  it('should enforce subclasses to implement a "getDefaultGraph" method', () => {
    const d = new Dataset()
    expect(() => d.getDefaultGraph()).to.throw(Error)
  })

  it('should enforce subclasses to implement a "addNamedGraph" method', () => {
    const d = new Dataset()
    expect(() => d.addNamedGraph()).to.throw(Error)
  })

  it('should enforce subclasses to implement a "getNamedGraph" method', () => {
    const d = new Dataset()
    expect(() => d.getNamedGraph()).to.throw(Error)
  })

  it('should provides a generic "getAllGraphs()" implementation', () => {
    const gA = new Graph()
    const gB = new Graph()
    const GRAPH_A_IRI = 'http://example.org#A'
    const GRAPH_B_IRI = 'http://example.org#B'
    const d = new HashMapDataset(GRAPH_A_IRI, gA)
    d.addNamedGraph(GRAPH_B_IRI, gB)
    const all = d.getAllGraphs()
    expect(all.length).to.equal(2)
    all.forEach(g => {
      expect(g.iri).to.be.oneOf([GRAPH_A_IRI, GRAPH_B_IRI])
    })
  })

  describe('#getUnionGraph', () => {
    const gA = new Graph()
    const gB = new Graph()
    const GRAPH_A_IRI = 'http://example.org#A'
    const GRAPH_B_IRI = 'http://example.org#B'
    const d = new HashMapDataset(GRAPH_A_IRI, gA)
    d.addNamedGraph(GRAPH_B_IRI, gB)

    it('should provides an UnionGraph (including the Default Graph)', () => {
      const union = d.getUnionGraph([GRAPH_B_IRI], true)
      expect(union._graphs.length).to.equal(2)
      union._graphs.forEach(g => {
        expect(g.iri).to.be.oneOf([GRAPH_A_IRI, GRAPH_B_IRI])
      })
    })

    it('should provides an UnionGraph (excluding the Default Graph)', () => {
      const union = d.getUnionGraph([GRAPH_B_IRI], false)
      expect(union._graphs.length).to.equal(1)
      expect(union._graphs[0].iri).to.equal(GRAPH_B_IRI)
    })
  })
})
