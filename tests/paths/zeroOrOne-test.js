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
const assert = require('chai').assert
const { getGraph, TestEngine } = require('../utils.js')

describe('SPARQL property paths: Zero or One paths', () => {
    let engine = null
    before(() => {
        const g = getGraph('./tests/data/paths.ttl')
        engine = new TestEngine(g)
    })
  
    it('should evaluate simple Zero or One path', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:skypeID? ?o .
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            switch (b['?s']) {
                case 'http://example.org/Alice':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Alice', '"skypeAlice"']);
                    break;
                case 'http://example.org/Bob':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Bob', '"skypeBob"']);
                    break;
            }          
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(21)
            done()
        })
    })

    it('should evaluate Zero or One sequence path', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:love/foaf:name)? ?o .
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            switch (b['?s']) {
                case 'http://example.org/Bob':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Bob', '"Carol"']);
                    break;
            }          
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(20)
            done()
        })
    })

    it('should evaluate nested Zero or One path', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:love/foaf:name?)? ?o .
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            switch (b['?s']) {
                case 'http://example.org/Alice':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Alice', 'http://example.org/Didier']);
                    break;
                case 'http://example.org/Bob':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Bob', 'http://example.org/Carol', '"Carol"']);
                    break;
                case 'http://example.org/Carol':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Carol', 'http://example.org/Didier']);
                    break;
            }          
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(23)
            done()
        })
    })

    it('should evaluate Zero or One alternative path', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (foaf:mbox|foaf:phone)? ?o .
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            switch (b['?s']) {
                case 'http://example.org/Alice':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Alice', 'mailto:alice@example', 'tel:0604651478']);
                    break;
                case 'http://example.org/Bob':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Bob', 'mailto:bob@example']);
                    break;
                case 'http://example.org/Carol':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Carol', 'tel:0645123549']);
                    break;
            }          
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(23)
            done()
        })
    })

    it('should evaluate Zero or One negated path', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/TR/rdf-schema/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !(foaf:name|foaf:phone|foaf:skypeID|foaf:mbox|rdf:type|rdfs:subClassOf|foaf:knows)? ?o .
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            switch (b['?s']) {
                case 'http://example.org/Alice':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Alice', 'http://example.org/Didier'])
                    break;
                case 'http://example.org/Bob':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Bob', 'http://example.org/Carol'])
                    break;
                case 'http://example.org/Carol':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Carol', 'http://example.org/Didier'])
                    break;
                case 'http://example.org/Eve':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Eve', 'http://example.org/Bob'])
                    break;
            }            
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(23)
            done()
        })
    })
})