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

const level = require('level')
const levelgraph = require('levelgraph')
const levelgraphN3 = require('levelgraph-n3')
const fs = require('fs')
const { HashMapDataset, Graph, PlanBuilder } = require('../src/api.js')
const { TransformIterator } = require('asynciterator')
const { mapKeys } = require('lodash')

/**
 * Build a LevelGraph store from a RDF file
 * @param  {string} filePath - Path to the content of the database (in Turtle)
 * @return {db} The LevelGraph database instance
 */
function getDB (filePath = null, name = 'testing_db') {
  // cleanup db first
  return new Promise((resolve, reject) => {
    level.destroy(name, () => {
      const db = levelgraphN3(levelgraph(level(name)))
      if (filePath === null) {
        resolve(db)
      } else {
        const stream = fs.createReadStream(filePath)
          .pipe(db.n3.putStream())
        stream.on('err', reject)
        stream.on('end', () => {
          resolve(db)
        })
      }
    })
  })
}

class LevelGraph extends Graph {
  constructor (db) {
    super()
    this._db = db
  }

  insert (triple) {
    return new Promise((resolve, reject) => {
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
    return new Promise((resolve, reject) => {
      this._db.del(triple, err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
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
    return new TransformIterator(this._db.searchStream(bgp))
      .map(item => {
        // fix '?' prefixes (removed by levelgraph)
        return mapKeys(item, (value, key) => {
          return '?' + key
        })
      })
  }
}

class LevelGraphEngine {
  constructor (db) {
    this._db = db
    this._graph = new LevelGraph(this._db)
    this._dataset = new HashMapDataset(this._graph)
    this._builder = new PlanBuilder(this._dataset)
  }

  addNamedGraph (iri, db) {
    this._dataset.addNamedGraph(iri, new LevelGraph(db))
  }

  getNamedGraph (iri) {
    return this._dataset.getNamedGraph(iri)
  }

  execute (query) {
    return this._builder.build(query)
  }
}

module.exports = {
  getDB,
  LevelGraphEngine
}
