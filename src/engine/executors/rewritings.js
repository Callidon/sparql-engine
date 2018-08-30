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
 * Build a SPARQL GROUP that selects all RDF triples from the Default Graph or a Named Graph
 * @private
 * @param  {Object}  source          - Source graph
 * @param  {dataset} dataset         - RDF dataset used to select the source
 * @param  {Boolean} isSilent        - True if errors should not be reported
 * @param  {Boolean} [isWhere=false] - True if the GROUP should belong to a WHERE clause
 * @return {Object} The SPARQL GROUP clasue
 */
function buildGroupClause (source, dataset, isSilent, isWhere = false) {
  if (source.default) {
    return allBGP()
  } else {
    // a SILENT modifier prevents errors when using an unknown graph
    if (!(dataset.hasNamedGraph(source.name)) && !isSilent) {
      throw new Error(`Unknown Source Graph in ADD query ${source.name}`)
    }
    return graphGroup(source.name, [allPattern()], isWhere)
  }
}

/**
 * Rewrite an ADD query into a INSERT query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#add
 * @param  {Object} addQuery - Parsed ADD query
 * @param  {Dataset} dataset - related RDF dataset
 * @return {Object} Rewritten ADD query
 */
function rewriteAdd (addQuery, dataset) {
  return {
    updateType: 'insertdelete',
    silent: addQuery.silent,
    insert: [buildGroupClause(addQuery.destination, dataset, addQuery.silent)],
    where: [buildGroupClause(addQuery.source, dataset, addQuery.silent, true)]
  }
}

/**
 * Rewrite a COPY query into a CLEAR + INSERT/DELETE query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#copy
 * @param  {Object} copyQuery - Parsed COPY query
 * @param  {Dataset} dataset - related RDF dataset
 * @return {Object[]} Rewritten COPY query, i.e., a sequence [CLEAR query, INSERT query]
 */
function rewriteCopy (copyQuery, dataset) {
  // first, build a CLEAR query to empty the destination
  const clear = {
    type: 'clear',
    silent: copyQuery.silent,
    graph: {}
  }
  if (copyQuery.destination.default) {
    clear.graph.default = true
  } else {
    clear.graph.type = copyQuery.destination.type
    clear.graph.name = copyQuery.destination.name
  }
  // then, build an INSERT query to copy the data
  const update = rewriteAdd(copyQuery, dataset)
  return [clear, update]
}

/**
 * Rewrite a MOVE query into a CLEAR + INSERT/DELETE + CLEAR query
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#move
 * @param  {Object} moveQuery - Parsed MOVE query
 * @param  {Dataset} dataset - related RDF dataset
 * @return {Object[]} Rewritten MOVE query, i.e., a sequence [CLEAR query, INSERT query, CLEAR query]
 */
function rewriteMove (moveQuery, dataset) {
  // first, build a classic COPY query
  const res = rewriteCopy(moveQuery, dataset)
  // then, append a CLEAR query to clear the source graph
  const clear = {
    type: 'clear',
    silent: moveQuery.silent,
    graph: {}
  }
  if (moveQuery.source.default) {
    clear.graph.default = true
  } else {
    clear.graph.type = moveQuery.source.type
    clear.graph.name = moveQuery.source.name
  }
  res.push(clear)
  return res
}

module.exports = {
  rewriteAdd,
  rewriteCopy,
  rewriteMove
}
