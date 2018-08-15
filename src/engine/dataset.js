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

/**
 * An abstraction over an RDF datasets, i.e., a collection of RDF graphs.
 * This class is the main extension point of the sparql engine,
 * and users should subclass it in order to connect the query engine
 * to the underlying database.
 * @abstract
 * @author Thomas Minier
 */
class Dataset {
  getDefaultGraph () {
    throw new Error('A valid Dataset must implements a "getDefaultGraph" method')
  }

  getNamedGraph (iri) {
    throw new Error('A valid Dataset must implements a "getNamedGraph" method')
  }

  insert (graph, triples, options) {
    throw new Error('A Dataset must implements an "insert" method to support SPARQL INSERT queries')
  }

  delete (graph, triple, options) {
    throw new Error('A Dataset must implements a "delete" method to support SPARQL DELETE queries')
  }

  /**
   * Evaluates a Basic Graph pattern, i.e., a set of triple patterns, using an iterator.
   * @param  {*} graph - The graph on which the BGP should be executed
   * @param  {Object[]} bgp - The set of triple patterns to evaluate
   * @param  {Object} options - Execution options
   * @return {AsyncIterator} An iterator which evaluates the Basic Graph pattern
   */
  evalBGP (graph, bgp, options) {
    throw new Error('A Dataset must implements an "evalBGP" method to support SPARQL queries')
  }

  evalTriplePattern (graph, pattern, options) {}

  clear (graph) {
    throw new Error('A Dataset must implements a "clear" method to support SPARQL CLEAR queries')
  }
}

module.exports = Dataset
