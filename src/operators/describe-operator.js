/* file : describe-operator.js
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

const { MultiTransformIterator } = require('asynciterator')
const BGPOperator = require('./bgp-operator.js')
const ConstructOperator = require('./construct-operator.js')
const { compact } = require('lodash')

/**
 * A Describe operator evaluates DESCRIBE SPARQL queries.
 * It produces a single result RDF graph containing RDF data about resources.
 * @extends MultiTransformIterator
 * @memberof Operators
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#describe}
 */
class DescribeOperator extends MultiTransformIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source  - Source iterator
   * @param {string[]} variables - Variables to describe
   * @param {string} url - URL of the SaGe server to request
   * @param {request} request - Request object used to perform HTTP requests
   * @param {Spy} [spy=null] - Spy used to gather metadata about query execution
   */
  constructor (source, variables, url, request, spy = null) {
    super(source)
    this._variables = variables
    this._url = url
    this._request = request
    this._templates = variables.map(v => {
      return {
        subject: v,
        predicate: `${v}__predicate`,
        object: `${v}__object`
      }
    })
    this._spy = spy
  }

  /**
   * Get the number of RDF triples produced by the operator
   * @return {integer} The number of RDF triples produced by the operator
   */
  get cardinality () {
    return null
  }

  _createTransformer (bindings) {
    const bgp = compact(this._templates.map(t => {
      const newTriple = Object.assign({}, t)
      if (!(t.subject in bindings)) return null
      newTriple.subject = bindings[t.subject]
      return newTriple
    }))
    const bgpSource = new BGPOperator(bgp, [], [], this._url, this._request, this._spy)
    return new ConstructOperator(bgpSource, bgp)
  }
}

module.exports = DescribeOperator
