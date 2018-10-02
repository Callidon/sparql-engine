'use strict'

const { BindingBase, HashMapDataset, Graph, PlanBuilder } = require('sparql-engine')
const level = require('level')
const levelgraph = require('levelgraph')
const { AsyncIterator } = require('asynciterator')

class LevelRDFGraph extends Graph {
  constructor (db) {
    super()
    this._db = db
  }

  evalBGP (bgp) {
    // rewrite variables using levelgraph API
    bgp = bgp.map(t => {
      if (t.subject.startsWith('?')) {
        t.subject = this._db.v(t.subject.substring(1))
      }
      if (t.predicate.startsWith('?')) {
        t.predicate = this._db.v(t.predicate.substring(1))
      }
      if (t.object.startsWith('?')) {
        t.object = this._db.v(t.object.substring(1))
      }
      return t
    })
    // Transform the Stream returned by LevelGraph into an AsyncIterator
    return AsyncIterator.wrap(this._db.searchStream(bgp))
      .map(item => {
        // Transform LevelGraph objects into set of mappings
        // using BindingBase.fromObject
        return BindingBase.fromObject(item)
      })
  }
}

const db = levelgraph(level('testing_db'))

// insert some triples
var triple1 = { subject: 'http://example.org#a1', predicate: 'http://xmlns.com/foaf/0.1/name', object: '"c"' }
var triple2 = { subject: 'http://example.org#a2', predicate: 'http://xmlns.com/foaf/0.1/name', object: '"d"' }
db.put([triple1, triple2], () => {
  const graph = new LevelRDFGraph(db)
  const dataset = new HashMapDataset(graph)

  const query = `
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?name
    WHERE {
      ?s foaf:name ?name .
    }`

  // Creates a plan builder for the RDF dataset
  const builder = new PlanBuilder(dataset)

  // Get an iterator to evaluate the query
  const iterator = builder.build(query)

  // Read results
  iterator.on('data', console.log)
  iterator.on('error', console.error)
  iterator.on('end', () => {
    console.log('Query evaluation complete!')
  })
})
