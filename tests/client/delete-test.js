/* file : delete-test.js
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
const { getDB, LevelGraphEngine } = require('../utils.js')

const GRAPH_IRI = 'htpp://example.org#some-graph'

describe('SPARQL UPDATE: DELETE DATA queries', () => {
  let engine = null
  beforeEach(done => {
    getDB(null)
      .then(dbA => {
        engine = new LevelGraphEngine(dbA)
        getDB(null, 'testing_db2')
          .then(dbB => {
            engine.addNamedGraph(GRAPH_IRI, dbB)
            done()
          })
      })
  })

  afterEach(done => {
    engine._db.close(() => {
      engine.getNamedGraph(GRAPH_IRI)._db.close(done)
    })
  })

  it('should evaluate DELETE DATA queries without a named Graph', done => {
    const query = `
    DELETE DATA {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf> <https://dblp.org/rec/conf/esws/MinierSMV18a>
    }`

    engine.execute(`
    INSERT DATA {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf> <https://dblp.org/rec/conf/esws/MinierSMV18a>
    }`)
      .execute()
      .then(() => engine.execute(query).execute())
      .then(() => {
        engine._db.get({ object: 'https://dblp.org/rec/conf/esws/MinierSMV18a' }, (err, list) => {
          if (err) {
            done(err)
          } else {
            expect(list.length).to.equal(0)
            done()
          }
        })
      })
      .catch(done)
  })

  it('should evaluate DELETE DATA queries using a named Graph', done => {
    const query = `
    DELETE DATA {
      GRAPH <${GRAPH_IRI}> {
        <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf> <https://dblp.org/rec/conf/esws/MinierSMV18a>
      }
    }`

    engine.execute(`
    INSERT DATA {
      GRAPH <${GRAPH_IRI}> {
        <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf> <https://dblp.org/rec/conf/esws/MinierSMV18a>
      }
    }`)
      .execute()
      .then(() => engine.execute(query).execute())
      .then(() => {
        engine.getNamedGraph(GRAPH_IRI)._db.get({ object: 'https://dblp.org/rec/conf/esws/MinierSMV18a' }, (err, list) => {
          if (err) {
            done(err)
          } else {
            expect(list.length).to.equal(0)
            done()
          }
        })
      })
      .catch(done)
  })
}).timeout(20000)
