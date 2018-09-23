/* file : orderby-operator.ts
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

import { AsyncIterator } from 'asynciterator'
import { Algebra } from 'sparqljs'
import MaterializeOperator from './materialize-operator'
import { Bindings } from '../rdf/bindings'

/**
 * A OrderByOperator implements a ORDER BY clause, i.e.,
 * it sorts solution mappings produced by another operator
 * @extends MaterializeOperator
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modOrderBy}
 */
export default class OrderByOperator extends MaterializeOperator {
  private _comparator: (left: Bindings, right: Bindings) => number
  /**
   * Constructor
   * @param source - Source iterator
   * @param comparators - Parsed ORDER BY clause
   * @param options - Execution options
   */
  constructor (source: AsyncIterator<Bindings>, comparators: Algebra.OrderComparator[], options: Object) {
    super(source, options)
    this._comparator = this._buildComparator(comparators.map((c: Algebra.OrderComparator) => {
      // explicity tag ascending comparator (sparqljs leaves them untagged)
      if (!('descending' in c)) {
        c.ascending = true
      }
      return c
    }))
  }

  /**
   * Build a comparator function from an ORDER BY clause content
   * @param  comparators - ORDER BY comparators
   * @return A comparator function
   */
  private _buildComparator (comparators: Algebra.OrderComparator[]) {
    const comparatorsFuncs = comparators.map((c: Algebra.OrderComparator) => {
      return (left: Bindings, right: Bindings) => {
        if (left.get(c.expression)! < right.get(c.expression)!) {
          return (c.ascending) ? -1 : 1
        } else if (left.get(c.expression)! > right.get(c.expression)!) {
          return (c.ascending) ? 1 : -1
        }
        return 0
      }
    })
    return (left: Bindings, right: Bindings) => {
      let temp
      for (let comp of comparatorsFuncs) {
        temp = comp(left, right)
        if (temp !== 0) {
          return temp
        }
      }
      return 0
    }
  }

  _transformAll (values: Bindings[]) {
    values.sort((a, b) => this._comparator(a, b))
    return values
  }
}
