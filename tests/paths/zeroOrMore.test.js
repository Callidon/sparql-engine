/* file : sequence-test.js
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
import { TestEngine, getGraph } from '../utils.js'

describe('SPARQL property paths: Zero or More paths', () => {
  let engine = null
  beforeAll(() => {
    const g = getGraph('./tests/data/paths.ttl')
    engine = new TestEngine(g)
  })

  it('should evaluate simple Zero or More path', async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/TR/rdf-schema/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s rdfs:subClassOf* ?type .
        }`
    const results = await engine.execute(query).toArray()
    const seen = new Set()
    results.forEach((b) => {
      b = b.toObject()
      expect(b).to.have.property('?s')
      expect(b).to.have.property('?type')
      switch (b['?s']) {
        case 'http://example.org/Woman':
          expect(b['?type']).to.be.oneOf([
            'http://example.org/Woman',
            'http://example.org/Person',
            'http://example.org/Human',
          ])
          seen.add(b['?type'])
          break
        case 'http://example.org/Man':
          expect(b['?type']).to.be.oneOf([
            'http://example.org/Man',
            'http://example.org/Person',
            'http://example.org/Human',
          ])
          seen.add(b['?type'])
          break
        case 'http://example.org/Person':
          expect(b['?type']).to.be.oneOf([
            'http://example.org/Person',
            'http://example.org/Human',
          ])
          seen.add(b['?type'])
          break
        default:
          if (b['?s'] !== b['?type']) {
            throw new Error(`Unexpected result ${JSON.stringify(b, null, 2)}`)
          }
      }
    })
    expect(seen.size).toBe(4)
  })

  it('should evaluate Zero or More sequence path', async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (foaf:knows/:love)* ?name .
        }`
    const results = await engine.execute(query).toArray()
    const seen = new Set()
    results.forEach((b) => {
      b = b.toObject()
      expect(b).to.have.property('?s')
      expect(b).to.have.property('?name')
      switch (b['?s']) {
        case 'http://example.org/Alice':
          expect(b['?name']).to.be.oneOf([
            'http://example.org/Alice',
            'http://example.org/Carol',
          ])
          seen.add(b['?name'])
          break
        case 'http://example.org/Bob':
          expect(b['?name']).to.be.oneOf([
            'http://example.org/Didier',
            'http://example.org/Bob',
          ])
          seen.add(b['?name'])
          break
        case 'http://example.org/Carol':
          expect(b['?name']).to.be.oneOf(['http://example.org/Carol'])
          seen.add(b['?name'])
          break
        default:
          if (b['?s'] !== b['?name']) {
            throw new Error(`Unexpected result ${JSON.stringify(b, null, 2)}`)
          }
      }
    })
    expect(seen.size).toBe(4)
  })

  it('should evaluate Zero or More alternative path', async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:hate|:love)* ?name .
        }`
    const results = await engine.execute(query).toArray()
    const seen = new Set()
    results.forEach((b) => {
      b = b.toObject()
      expect(b).to.have.property('?s')
      expect(b).to.have.property('?name')
      switch (b['?s']) {
        case 'http://example.org/Alice':
          expect(b['?name']).to.be.oneOf([
            'http://example.org/Alice',
            'http://example.org/Didier',
          ])
          seen.add(b['?name'])
          break
        case 'http://example.org/Bob':
          expect(b['?name']).to.be.oneOf([
            'http://example.org/Bob',
            'http://example.org/Carol',
            'http://example.org/Didier',
          ])
          seen.add(b['?name'])
          break
        case 'http://example.org/Carol':
          expect(b['?name']).to.be.oneOf([
            'http://example.org/Carol',
            'http://example.org/Didier',
          ])
          seen.add(b['?name'])
          break
        case 'http://example.org/Eve':
          expect(b['?name']).to.be.oneOf([
            'http://example.org/Eve',
            'http://example.org/Bob',
            'http://example.org/Carol',
            'http://example.org/Didier',
          ])
          seen.add(b['?name'])
          break
        default:
          if (b['?s'] !== b['?name']) {
            throw new Error(`Unexpected result ${JSON.stringify(b, null, 2)}`)
          }
      }
    })
    expect(seen.size).toBe(5)
  })

  it('should evaluate Zero or More negated path', async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/TR/rdf-schema/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !(foaf:name|foaf:phone|foaf:skypeID|foaf:mbox|rdf:type|rdfs:subClassOf|foaf:knows)* ?o .
        }`
    const results = await engine.execute(query).toArray()
    const seen = new Set()
    results.forEach((b) => {
      b = b.toObject()
      expect(b).to.have.property('?s')
      expect(b).to.have.property('?o')
      switch (b['?s']) {
        case 'http://example.org/Alice':
          expect(b['?o']).to.be.oneOf([
            'http://example.org/Alice',
            'http://example.org/Didier',
          ])
          seen.add(b['?o'])
          break
        case 'http://example.org/Bob':
          expect(b['?o']).to.be.oneOf([
            'http://example.org/Bob',
            'http://example.org/Carol',
            'http://example.org/Didier',
          ])
          seen.add(b['?o'])
          break
        case 'http://example.org/Carol':
          expect(b['?o']).to.be.oneOf([
            'http://example.org/Carol',
            'http://example.org/Didier',
          ])
          seen.add(b['?o'])
          break
        case 'http://example.org/Eve':
          expect(b['?o']).to.be.oneOf([
            'http://example.org/Eve',
            'http://example.org/Bob',
            'http://example.org/Carol',
            'http://example.org/Didier',
          ])
          seen.add(b['?o'])
          break
        default:
          if (b['?s'] !== b['?o']) {
            throw new Error(`Unexpected result ${JSON.stringify(b, null, 2)}`)
          }
      }
    })
    expect(seen.size).toBe(5)
  })
})
