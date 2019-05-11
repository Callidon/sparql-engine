/* file : sequence-test.js
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
const { getGraph, TestEngine } = require('../utils.js')

describe('SPARQL property paths: sequence paths', () => {
    let engine = null
    before(() => {
        const g = getGraph('./tests/data/paths.ttl')
        engine = new TestEngine(g)
      })

    it('should evaluate sequence path of length 2', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:knows/rdf:type ?o.
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            expect(b['?s']).to.be.oneOf(['http://example.org/Alice', 'http://example.org/Bob', 'http://example.org/Carol'])
            expect(b['?o']).to.be.oneOf(['http://example.org/Man', 'http://example.org/Woman'])
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(3)
            done()
        })
    })

    it('should evaluate sequence path of length 3', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:knows/foaf:knows/rdf:type :Woman.
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.keys('?s')
            expect(b['?s']).to.be.oneOf(['http://example.org/Alice', 'http://example.org/Carol'])
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(2)
            done()
        })
    })

    it('should evaluate sequence of alternative paths', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:love|:hate)/(foaf:mbox|foaf:phone) ?o.
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            switch (b['?s']) {
                case 'http://example.org/Bob':
                    expect(b['?o']).to.be.oneOf(['tel:0645123549'])
                    break;
                case 'http://example.org/Eve':
                    expect(b['?o']).to.be.oneOf(['mailto:bob@example'])
                    break;
            }           
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(2)
            done()
        })
    })
})
