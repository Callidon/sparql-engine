/* file : dataset.js
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

const UnionGraph = require('./union-graph.js')

/**
 * An abstraction over an RDF datasets, i.e., a collection of RDF graphs.
 * @abstract
 * @author Thomas Minier
 */
class Dataset {
  get iris () {
    return this.getAllGraphs(false).map(g => g.iri)
  }
  /**
   * Set the Default Graph of the Dataset
   * @param {Graph} g - Default Graph
   */
  setDefaultGraph (g) {
    throw new Error('A valid Dataset must implements a "setDefaultGraph" method')
  }

  /**
   * Get the Default Graph of the Dataset
   * @return {Graph} The Default Graph of the Dataset
   */
  getDefaultGraph () {
    throw new Error('A valid Dataset must implements a "getDefaultGraph" method')
  }

  /**
   * Add a Named Graph to the Dataset
   * @param {string} iri - IRI of the Named Graph
   * @param {Graph} g    - RDF Graph
   */
  addNamedGraph (iri, g) {
    throw new Error('A valid Dataset must implements a "addNamedGraph" method')
  }

  /**
   * Get a Named Graph using its IRI
   * @param  {string} iri - IRI of the Named Graph to retrieve
   * @return {Graph} The corresponding Named Graph
   */
  getNamedGraph (iri) {
    throw new Error('A valid Dataset must implements a "getNamedGraph" method')
  }

  /**
   * Return True if the Dataset contains a Named graph with the provided IRI
   * @param  {string} iri - IRI of the Named Graph
   * @return {boolean} True if the Dataset contains a Named graph with the provided IRI
   */
  hasNamedGraph (iri) {
    throw new Error('A valid Dataset must implements a "hasNamedGraph" method')
  }

  /**
   * Get an UnionGraph, i.e., the dynamic union of several graphs,
   * from the RDF Graphs in the Dataset.
   * @param  {string[]} iris                  - Iris of the named graphs to include in the union
   * @param  {Boolean} [includeDefault=false] - True if the default graph should be included
   * @return {UnionGraph} The dynamic union of several graphs in the Dataset
   */
  getUnionGraph (iris, includeDefault = false) {
    let graphs = []
    if (includeDefault) {
      graphs.push(this.getDefaultGraph())
    }
    graphs = graphs.concat(iris.map(iri => this.getNamedGraph(iri)))
    return new UnionGraph(graphs)
  }

  /**
   * Returns all Graphs in the Dataset, including the Default one
   * @return {Graph[]} The list of all graphs in the Dataset
   */
  getAllGraphs (includeDefault = true) {
    const graphs = []
    if (includeDefault) {
      graphs.push(this.getDefaultGraph())
    }
    this._namedGraphs.forEach(g => {
      graphs.push(g)
    })
    return graphs
  }
}

module.exports = Dataset
