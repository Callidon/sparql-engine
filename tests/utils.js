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
const { PlanBuilder, BGPExecutor } = require('../src/api.js')
const { MultiTransformIterator, TransformIterator } = require('asynciterator')
const { assign, mapKeys, some, size } = require('lodash')
const rdf = require('ldf-client/lib/util/RdfUtil')

/**
 * Build a LevelGraph store from a RDF file
 * @param  {string} filePath - Path to the content of the database (in Turtle)
 * @return {db} The LevelGraph database instance
 */
function getDB (filePath) {
  // cleanup db first
  const db = levelgraphN3(levelgraph(level('testing_db')))
  return new Promise((resolve, reject) => {
    // first, check if DB is not empty to avoid duplicated insertion
    db.get({ limit: 1 }, (err, list) => {
      if (err) {
        reject(err)
      } else if (list.length > 0) {
        resolve(db)
      } else {
        const stream = fs.createReadStream(filePath)
          .pipe(db.n3.putStream())

        stream.on('err', reject)

        stream.on('finish', () => {
          resolve(db)
        })
      }
    })
  })
}

/**
 * Evaluates BGP over a LevelGraph DB
 * @extends MultiTransformIterator
 */
class LevelGraphIterator extends MultiTransformIterator {
  constructor (source, bgp, db) {
    super(source)
    this._bgp = bgp
    this._db = db
  }

  _createTransformer (bindings) {
    let boundedBGP = this._bgp.map(p => rdf.applyBindings(bindings, p))
    const hasVars = boundedBGP.map(p => some(p, v => v.startsWith('?')))
      .reduce((acc, v) => acc && v, true)
    boundedBGP = boundedBGP.map(t => {
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
    const stream = this._db.searchStream(boundedBGP)
    return new TransformIterator(stream)
      .map(item => {
        if (size(item) === 0 && hasVars) return null
        // fix '?' prefixes removed by levelgraph
        item = mapKeys(item, (value, key) => {
          return '?' + key
        })
        return assign(item, bindings)
      })
  }
}

class LevelGraphExecutor extends BGPExecutor {
  constructor (db) {
    super()
    this._db = db
  }

  execute (source, patterns, options, isJoinIdentity) {
    return new LevelGraphIterator(source, patterns, this._db)
  }
}

class LevelGraphEngine {
  constructor (db) {
    this._db = db
    this._builder = new PlanBuilder()
    this._builder.setExecutor(new LevelGraphExecutor(this._db))
  }

  execute (query) {
    return this._builder.build(query)
  }
}

module.exports = {
  getDB,
  LevelGraphEngine
}
