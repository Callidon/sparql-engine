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

describe('SPARQL property paths: Negated property sets', () => {
    let engine = null
    before(() => {
        const g = getGraph('./tests/data/paths.ttl')
        engine = new TestEngine(g)
    })

    const data = [
        {
            name: "Zero or One path",
            query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(foaf:knows?) ?o .
                }`
        },
        {
            name: "Zero or More path",
            query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(foaf:knows*) ?o .
                }`
        },
        {
            name: "One or More path",
            query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(foaf:knows+) ?o .
                }`
        },
        {
            name: "sequence path",
            query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(foaf:knows/foaf:name) ?o .
                }`
        },
        {
            name: "negated path",
            query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(!foaf:knows|foaf:name) ?o .
                }`
        }
    ]

    data.forEach(d => {
        it(`should not evaluate negated "${d.name}" `, done => {
            try {
                engine.execute(d.query)
            } catch (error) {
                done()
            }
            assert.fail()
        })
    })

    it('should evaluate negated property set of length 1', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !foaf:knows ?o .
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            switch (b['?s']) {
                case 'http://example.org/Alice':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Woman', '"Alice"', 'tel:0604651478', '"skypeAlice"', 'http://example.org/Didier', 'mailto:alice@example'])
                    break;
                case 'http://example.org/Bob':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Man', '"Bob"', '"skypeBob"', 'mailto:bob@example', 'http://example.org/Carol'])
                    break;
                case 'http://example.org/Carol':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Woman', '"Carol"' , 'tel:0645123549', 'http://example.org/Didier'])
                    break;
                case 'http://example.org/Woman':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Person'])
                    break;
                case 'http://example.org/Man':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Person'])
                    break;
                case 'http://example.org/Person':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Human'])
                    break;
                case 'http://example.org/Eve':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Bob'])
                    break;
            }            
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(19)
            done()
        })
    })

    it('should evaluate negated property set of length 4', done => {
        const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !(foaf:mbox|foaf:knows|foaf:name|rdf:type) ?o .
        }`
        const results = []
        const iterator = engine.execute(query)
        iterator.subscribe(b => {
            b = b.toObject()
            expect(b).to.have.property('?s')
            expect(b).to.have.property('?o')
            switch (b['?s']) {
                case 'http://example.org/Alice':
                    expect(b['?o']).to.be.oneOf(['tel:0604651478', '"skypeAlice"', 'http://example.org/Didier'])
                    break;
                case 'http://example.org/Bob':
                    expect(b['?o']).to.be.oneOf(['"skypeBob"', 'http://example.org/Carol'])
                    break;
                case 'http://example.org/Carol':
                    expect(b['?o']).to.be.oneOf(['tel:0645123549', 'http://example.org/Didier'])
                    break;
                case 'http://example.org/Woman':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Person'])
                    break;
                case 'http://example.org/Man':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Person'])
                    break;
                case 'http://example.org/Person':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Human'])
                    break;
                case 'http://example.org/Eve':
                    expect(b['?o']).to.be.oneOf(['http://example.org/Bob'])
                    break;
            }            
            results.push(b)
        }, done, () => {
            expect(results.length).to.equal(11)
            done()
        })
    })
})