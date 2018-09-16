/* file : construct-operator.ts
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

import { AsyncIterator, ArrayIterator, MultiTransformIterator } from 'asynciterator'
import { Algebra } from 'sparqljs'
import { compact } from 'lodash'
import { applyBindings, rdf } from '../../utils.js'

/**
 * A ConstructOperator transform solution mappings into RDF triples, according to a template
 * @extends TransformIterator
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct}
 */
export default class ConstructOperator extends MultiTransformIterator {
  readonly _templates: Algebra.TripleObject[]
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source  - Source iterator
   * @param {Object[]} templates - Set of triples patterns in the CONSTRUCT clause
   */
  constructor (source: AsyncIterator, query: Algebra.RootNode) {
    super(source)
    // filter out triples with no SPARQL variables to output them only once
    this._templates = query.template!.filter(t => {
      if (rdf.isVariable(t.subject) || rdf.isVariable(t.predicate) || rdf.isVariable(t.object)) {
        return true
      }
      this._push(t)
      return false
    })
    source.on('error', err => this.emit('error', err))
  }

  _createTransformer (bindings: Object): AsyncIterator {
    return new ArrayIterator(compact(this._templates.map(t => applyBindings(t, bindings))))
  }
}
