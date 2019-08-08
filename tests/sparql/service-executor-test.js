/* file : service-executor-test.js
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
const ServiceExecutor = require('../../dist/engine/executors/service-executor.js').default
const ExecutionContext = require('../../dist/engine/context/execution-context.js').default
const DEFAULT_GRAPH_IRI = 'http://projects1.example.org/sparql'
const PROJECTS2_IRI = 'http://projects2.example.org/sparql'
const PROJECTS3_IRI = 'http://projects3.example.org/sparql'

class TestServiceExecutor extends ServiceExecutor {
  constructor(_planBuilder) {
    super()
    this.planBuilder = _planBuilder
    this.projects2Graph = getGraph('./tests/data/SPARQL-Federated-Query-1.1-4.projects2.ttl')
    this.projects3Graph = getGraph('./tests/data/SPARQL-Federated-Query-1.1-4.projects3.ttl')
    this.projects2Engine = new TestEngine(this.projects2Graph, PROJECTS2_IRI)
    this.projects3Engine = new TestEngine(this.projects3Graph, PROJECTS3_IRI)
  }

  _execute(source, iri, subquery, context) {
    switch (iri) {
      case DEFAULT_GRAPH_IRI: return this.planBuilder._buildQueryPlan(subquery, new ExecutionContext(), source)
      case PROJECTS2_IRI: return this.projects2Engine._builder._buildQueryPlan(subquery, new ExecutionContext(), source)
      case PROJECTS3_IRI: return this.projects3Engine._builder._buildQueryPlan(subquery, new ExecutionContext(), source)
      default: throw ("Got an unexpected IRI: " + iri)
    }
    return source;
  }
}

describe('SERVICE queries', () => {
  let engine = null
  beforeEach(() => {
    const defaultGraph = getGraph('./tests/data/SPARQL-Federated-Query-1.1-4.default-graph.ttl')
    engine = new TestEngine(defaultGraph, DEFAULT_GRAPH_IRI)
    const serviceExecutor = new TestServiceExecutor(engine._builder)
    engine._builder.serviceExecutor = serviceExecutor
  })

  const data = [
    {
      text: 'should execute the SERVICE query described in section 4 of the SPARQL Federated Query spec',
      query: `
      PREFIX  void: <http://rdfs.org/ns/void#>
      PREFIX  dc:   <http://purl.org/dc/elements/1.1/>
      PREFIX  doap: <http://usefulinc.com/ns/doap#> 
      
      SELECT ?service ?projectName
      WHERE {
        # Find the service with subject "remote".
        ?p dc:subject ?projectSubject ;
           void:sparqlEndpoint ?service .
           FILTER regex(?projectSubject, "remote")
      
        # Query that service projects.
        SERVICE ?service {
           ?project  doap:name ?projectName . } 
      }
      `,
      nbResults: 3,
      testFun: function (b) {
        expect(b['?service']).to.be.oneOf([PROJECTS2_IRI, PROJECTS3_IRI])
        expect(b['?projectName']).to.be.oneOf(['"Query remote RDF Data"', '"Querying multiple SPARQL endpoints"', '"Update remote RDF Data"'])
      }
    }
  ]

  data.forEach(d => {
    it(d.text, done => {
      let nbResults = 0
      const iterator = engine.execute(d.query)
      iterator.subscribe(b => {
        b = b.toObject()
        d.testFun(b)
        nbResults++
      }, done, () => {
        expect(nbResults).to.equal(d.nbResults)
        done()
      })
    })
  })

})
