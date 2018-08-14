/* file : construct-operator.js
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

const { TransformIterator } = require('asynciterator')
const { compact } = require('lodash')
const { applyBindings, rdf } = require('../../utils.js')

/**
 * A ConstructOperator transform solution mappings into RDF triples, according to a template
 * @extends TransformIterator
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct}
 */
class ConstructOperator extends TransformIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source  - Source iterator
   * @param {Object[]} templates - Set of triples patterns in the CONSTRUCT clause
   */
  constructor (source, query) {
    super(source)
    // filter out triples with no SPARQL variables to output them only once
    this._templates = query.template.filter(t => {
      if (rdf.isVariable(t.subject) || rdf.isVariable(t.predicate) || rdf.isVariable(t.object)) {
        return true
      }
      this._push(this._writer.tripleToString(t.subject, t.predicate, t.object))
      return false
    })
  }

  _transform (bindings, done) {
    compact(this._templates.map(t => applyBindings(t, bindings)))
      .forEach(t => {
        this._push(t)
        // // dirty fix for N3.js parsing bug with datatypes surounded by brackets
        // if (t.object.endsWith('>')) {
        //   const startIndex = t.object.lastIndexOf('<')
        //   t.object = t.object.substr(0, startIndex) + t.object.substr(startIndex + 1, t.object.length - startIndex - 2)
        // }
        // this._push(this._writer.quadToString(t.subject, t.predicate, t.object))
      })
    done()
  }
}

module.exports = ConstructOperator
