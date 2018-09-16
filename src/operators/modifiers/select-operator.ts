/* file : select-operator.ts
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

import { AsyncIterator, TransformIterator } from 'asynciterator'
import { Algebra } from 'sparqljs'
import { rdf } from '../../utils.js'
import { mapValues } from 'lodash'

/**
 * Evaluates a SPARQL SELECT operation, i.e., perform a selection over sets of solutions bindings
 * @extends TransformIterator
 * @author Thomas Minier
 * @author Corentin Marionneau
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#select}
 */
export default class SelectOperator extends TransformIterator {
  readonly _variables: string[]
  readonly _selectAll: boolean
  readonly _options: Object

  constructor (source: AsyncIterator, query: Algebra.RootNode, options: Object) {
    super(source)
    this._variables = query.variables!
    this._options = options
    this._selectAll = this._variables.length === 1 && this._variables[0] === '*'
    source.on('error', (err: Error) => this.emit('error', err))
  }

  _transform (bindings: Object, done: () => void): void {
    // perform projection (if necessary)
    if (!this._selectAll) {
      bindings = this._variables.reduce((obj, v) => {
        if (v in bindings) {
          obj[v] = bindings[v]
        } else {
          obj[v] = null
        }
        return obj
      }, {})
    }
    // remove non-variables entries && non-string values
    this._push(mapValues(bindings, (v, k) => rdf.isVariable(k) && typeof v === 'string' ? v : null))
    done()
  }
}
