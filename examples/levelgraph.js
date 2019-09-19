'use strict'

const { BindingBase, HashMapDataset, Graph, PlanBuilder, Pipeline } = require('sparql-engine')
const level = require('level')
const levelgraph = require('levelgraph')

class LevelRDFGraph extends Graph {
  constructor (db) {
    super()
    this._db = db
  }

  evalBGP (bgp) {
    // Connect the Node.js Readable stream
    // into the SPARQL query engine using the fromAsync method
    return Pipeline.getInstance().fromAsync(input => {
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
      // Evaluates the BGP using Levelgraph stream API
      const stream = this._db.searchStream(bgp)

      // pipe results & errors into the query engine
      stream.on('error', err => input.error(err))
      stream.on('end', () => input.complete())
      // convert Levelgraph solutions into Bindings objects (the format used by sparql-engine)
      stream.on('data', results => input.next(BindingBase.fromObject(results)))
    })
  }


  insert (triple) {
    return new Promise(function(resolve, reject) {
      this._db.put(triple, err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  delete (triple) {
    return new Promise(function(resolve, reject) {
      this._db.del(triple, err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

const db = levelgraph(level('testing_db'))

// insert some triples
var triple1 = { subject: 'http://example.org#a1', predicate: 'http://xmlns.com/foaf/0.1/name', object: '"c"' }
var triple2 = { subject: 'http://example.org#a2', predicate: 'http://xmlns.com/foaf/0.1/name', object: '"d"' }
db.put([triple1, triple2], () => {
  const graph = new LevelRDFGraph(db)
  const dataset = new HashMapDataset('http://example.org#default', graph)

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
  iterator.subscribe(bindings => {
    console.log('Find solutions:', bindings.toObject())
  }, err => {
    console.error('error', err)
  }, () => {
    console.log('Query evaluation complete!')
  })
})
