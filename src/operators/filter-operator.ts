/* file : filter-operator.ts
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

import SPARQLExpression from './expressions/sparql-expression'
import { AsyncIterator, TransformIterator } from 'asynciterator'
import { Algebra } from 'sparqljs'
import { Bindings } from '../rdf/bindings'

/**
 * Evaluate SPARQL Filter clauses
 * @see {@link https://www.w3.org/TR/sparql11-query/#expressions}
 * @extends TransformIterator
 * @author Thomas Minier
 */
export default class FilterOperator extends TransformIterator<Bindings,Bindings> {
  private readonly _expression: SPARQLExpression

  /**
   * Constructor
   * @param source  - Source iterator
   * @param expression - FILTER expression
   * @param options - Execution options
   */
  constructor (source: AsyncIterator<Bindings>, expression: Algebra.Expression, options: Object) {
    super(source, options)
    this._expression = new SPARQLExpression(expression)
  }

  _transform (bindings: Bindings, done: () => void): void {
    const value: any = this._expression.evaluate(bindings)
    if (value !== null && value.asJS) {
      this._push(bindings)
    }
    done()
  }
}
