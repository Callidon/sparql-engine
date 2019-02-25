'use strict'

const { Parser, Store } = require('n3')
const { HashMapDataset, Graph, PlanBuilder } = require('../')
const terms = require('../dist/rdf-terms')

// Format a triple pattern according to N3 API:
// SPARQL variables must be replaced by `null` values
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
    return this._store.getTriples(subject, predicate, object)
  }

  estimateCardinality(triple) {
    const { subject, predicate, object } = formatTriplePattern(triple)
    return Promise.resolve(this._store.countTriples(subject, predicate, object))
  }
}

const graph = new N3Graph()
const dataset = new HashMapDataset('http://example.org#default', graph)

// Load some RDF data into the graph
const parser = new Parser()
parser.parse(`
  @prefix foaf: <http://xmlns.com/foaf/0.1/> .
  @prefix : <http://example.org#> .
  :a foaf:name "abc" .
  :b foaf:name "xyz" .
`).forEach(t => {
  graph._store.addTriple(t)
})

const query = `
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX example: <http://example.com#>
  SELECT ?name ?reversed
  WHERE {
    ?s foaf:name ?name .
    BIND(example:REVERSE(?name) as ?reversed) .
  }`

function cloneLiteral(base, newValue) {
  switch (base.type) {
    case 'literal+type':
      return terms.TypedLiteralDescriptor(newValue, base.datatype)
    case 'literal+lang':
      return terms.LangLiteralDescriptor(newValue, base.lang)
    default:
      return terms.RawLiteralDescriptor(newValue)
  }
}

const customFunctions = {
  'http://example.com#REVERSE': function (a) {
    return cloneLiteral(a, a.value.split("").reverse().join(""))
  }
}

// Creates a plan builder for the RDF dataset
const builder = new PlanBuilder(dataset, {}, customFunctions)

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
