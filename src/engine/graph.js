/* file : graph.js
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

/**
 * An abstract RDF Graph, accessed through a RDF Dataset
 * @abstract
 * @author Thomas Minier
 */
class Graph {
  constructor () {
    this._iri = null
  }

  get iri () {
    return this._iri
  }

  set iri (value) {
    this._iri = value
  }

  /**
   * Insert a RDF triple into the RDF Graph
   * @param  {Object}   triple - RDF Triple to insert
   * @param  {string}   triple.subject - RDF triple's subject
   * @param  {string}   triple.predicate - RDF triple's predicate
   * @param  {string}   triple.object - RDF triple's object
   * @return {Promise} A Promise fullfilled when the insertion has been completed
   */
  insert (triple, done) {
    throw new Error('A Graph must implements an "insert" method to support SPARQL INSERT queries')
  }

  /**
   * Delete a RDF triple from the RDF Graph
   * @param  {Object}   triple - RDF Triple to delete
   * @param  {string}   triple.subject - RDF triple's subject
   * @param  {string}   triple.predicate - RDF triple's predicate
   * @param  {string}   triple.object - RDF triple's object
   * @return {Promise} A Promose fullfilled when the deletion has been completed
   */
  delete (triple, done) {
    throw new Error('A Graph must implements a "delete" method to support SPARQL DELETE queries')
  }

  /**
   * Evaluates a Basic Graph pattern, i.e., a set of triple patterns, on the Graph using an iterator.
   * @param  {Object[]} bgp - The set of triple patterns to evaluate
   * @param  {Object} options - Execution options
   * @return {AsyncIterator} An iterator which evaluates the Basic Graph pattern on the Graph
   */
  evalBGP (bgp, options) {
    throw new Error('A Graph must implements an "evalBGP" method to support SPARQL queries')
  }
}

module.exports = Graph
