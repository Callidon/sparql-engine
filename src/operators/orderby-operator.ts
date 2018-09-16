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
import MaterializeOperator from './materialize-operator'

export interface OrderComparator {
  expression: string,
  ascending?: boolean,
  descending?: boolean
}

/**
 * A OrderByOperator implements a ORDER BY clause, i.e.,
 * it sorts solution mappings produced by another operator
 * @extends MaterializeOperator
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modOrderBy}
 */
export default class OrderByOperator extends MaterializeOperator {
  private _comparator: (left: Object, right: Object) => number
  /**
   * Constructor
   * @param {AsyncIterator} source - Source iterator
   * @param {Object[]} comparators - Parsed ORDER BY clause
   * @param {Object} options - Execution options
   */
  constructor (source: AsyncIterator, comparators: OrderComparator[], options: Object) {
    super(source, options)
    this._comparator = this._buildComparator(comparators.map((c: OrderComparator) => {
      // explicity tag ascending comparator (sparqljs leaves them untagged)
      if (!('descending' in c)) {
        c.ascending = true
      }
      return c
    }))
  }

  _buildComparator (comparators: OrderComparator[]) {
    const comparatorsFuncs = comparators.map((c: OrderComparator) => {
      return (left: Object, right: Object[]) => {
        if (left[c.expression] < right[c.expression]) {
          return (c.ascending) ? -1 : 1
        } else if (left[c.expression] > right[c.expression]) {
          return (c.ascending) ? 1 : -1
        }
        return 0
      }
    })
    return (left: any, right: any) => {
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

  _transformAll (values: Object[]) {
    values.sort((a, b) => this._comparator(a, b))
    return values
  }
}
