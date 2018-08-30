/* file : hashmap-dataset.js
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

const Dataset = require('./dataset.js')

/**
 * A simple Dataset backed by a HashMap.
 * @extends Dataset
 * @author Thomas Minier
 */
class HashMapDataset extends Dataset {
  /**
   * Constructor
   * @param {string} defaultGraphIRI - IRI of the Default Graph
   * @param {Graph} defaultGraph     - Default Graph
   */
  constructor (defaultGraphIRI, defaultGraph) {
    super()
    defaultGraph.iri = defaultGraphIRI
    this._defaultGraph = defaultGraph
    this._namedGraphs = new Map()
  }

  setDefaultGraph (g) {
    this._defaultGraph = g
  }

  getDefaultGraph () {
    return this._defaultGraph
  }

  addNamedGraph (iri, g) {
    g.iri = iri
    this._namedGraphs.set(iri, g)
  }

  getNamedGraph (iri) {
    if (iri === this._defaultGraph.iri) {
      return this.getDefaultGraph()
    } else if (!this._namedGraphs.has(iri)) {
      throw new Error(`Unknown graph with iri ${iri}`)
    }
    return this._namedGraphs.get(iri)
  }

  hasNamedGraph (iri) {
    return this._namedGraphs.has(iri)
  }
}

module.exports = HashMapDataset
