/* file : rewritings.js
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
 * Create a triple pattern that matches all RDF triples in a graph
 * @private
 * @return {Object} A triple pattern that matches all RDF triples in a graph
 */
function allPattern () {
  return {
    subject: '?s',
    predicate: '?p',
    object: '?o'
  }
}

/**
 * Create a BGP that matches all RDF triples in a graph
 * @private
 * @return {Object} A BGP that matches all RDF triples in a graph
 */
function allBGP () {
  return {
    type: 'bgp',
    triples: [allPattern()]
  }
}

/**
 * Create a GRAPH group
 * @private
 * @param  {string} iri - Graph's iri
 * @param  {Object[]} triples - Triples patterns in the group
 * @param  {boolean} [isWhere=true] - True if the GRAPH is part of a WHERE clause, False otherwise
 * @return {Object} A GRAPH group
 */
function graphGroup (iri, triples, isWhere = true) {
  if (isWhere) {
    return {
      type: 'graph',
      name: iri,
      patterns: [{
        type: 'bgp',
        triples
      }]
    }
  }
  return {
    type: 'graph',
    name: iri,
    triples
  }
}

/**
 * Rewrite an ADD query into a INSERT query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#add
 * @param  {Object} addQuery - Parsed ADD query
 * @return {Object} Rewritten ADD query
 */
function rewriteAdd (addQuery, dataset) {
  // Used to select ADD source/destination (default graph or a Named graph)
  function selectGraph (clause, dataset, isWhere = false) {
    if (clause.default) {
      return allBGP()
    } else {
      // a SILENT modifier prevents errors when using an unknown graph
      if (!(dataset.hasNamedGraph(clause.name)) && !addQuery.silent) {
        throw new Error(`Unknown Source Graph in ADD query ${clause.name}`)
      }
      return graphGroup(clause.name, [allPattern()], isWhere)
    }
  }
  const res = {
    updateType: 'insertdelete',
    insert: [selectGraph(addQuery.destination, dataset)],
    where: [selectGraph(addQuery.source, dataset, true)]
  }
  return res
}

module.exports = {
  rewriteAdd
}
