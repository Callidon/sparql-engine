/* file : utils.js
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

const { Parser, Store } = require('n3')
const fs = require('fs')
const { HashMapDataset, Graph, PlanBuilder } = require('../dist/api.js')
const { pick } = require('lodash')

function getGraph(filePath = null) {
  const graph = new N3Graph()
  if (filePath !== null) {
    graph.parse(filePath)
  }
  return graph
}

function formatTriplePattern(triple) {
  let subject = null
  let predicate = null
  let object = null
  if (!triple.subject.startsWith('?')) {
    subject = triple.subject
  }
  if (!triple.predicate.startsWith('?')) {
    predicate = triple.predicate
  }
  if (!triple.object.startsWith('?')) {
    object = triple.object
  }
  return { subject, predicate, object }
}

class N3Graph extends Graph {
  constructor() {
    super()
    this._store = Store()
    this._parser = Parser()
  }

  parse(file) {
    const content = fs.readFileSync(file).toString('utf-8')
    this._parser.parse(content).forEach(t => {
      this._store.addTriple(t)
    })
  }

  insert(triple) {
    return new Promise((resolve, reject) => {
      try {
        this._store.addTriple(triple.subject, triple.predicate, triple.object)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }

  delete(triple) {
    return new Promise((resolve, reject) => {
      try {
        this._store.removeTriple(triple.subject, triple.predicate, triple.object)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }

  find(triple) {
    const { subject, predicate, object } = formatTriplePattern(triple)
    return this._store.getTriples(subject, predicate, object).map(t => {
      return pick(t, ['subject', 'predicate', 'object'])
    })
  }

  estimateCardinality(triple) {
    const { subject, predicate, object } = formatTriplePattern(triple)
    return Promise.resolve(this._store.countTriples(subject, predicate, object))
  }

  clear() {
    const triples = this._store.getTriples(null, null, null)
    this._store.removeTriples(triples)
    return Promise.resolve()
  }
}

class TestEngine {
  constructor(graph, defaultGraphIRI = null, customOperations = {}) {
    this._graph = graph
    this._dataset = new HashMapDataset(defaultGraphIRI, this._graph)
    this._builder = new PlanBuilder(this._dataset, {}, customOperations)
  }

  addNamedGraph(iri, db) {
    this._dataset.addNamedGraph(iri, db)
  }

  getNamedGraph(iri) {
    return this._dataset.getNamedGraph(iri)
  }

  execute(query, format = 'raw') {
    let iterator = this._builder.build(query)
    return iterator
  }
}

module.exports = {
  getGraph,
  TestEngine
}
