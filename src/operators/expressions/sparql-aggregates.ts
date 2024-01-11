/* file : sparql-aggregates.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

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

import { maxBy, meanBy, minBy, sample } from 'lodash'
import { BindingGroup } from '../../rdf/bindings.js'
import { rdf } from '../../utils.js'

/**
 * SPARQL Aggregation operations.
 * Each operation takes an arguments a SPARQL variable and a row of bindings, i.e., a list of
 * solutions bindings on which the aggregation must be applied.
 * Each operations is expected to return a term, as with classic SPARQL operations
 * @see https://www.w3.org/TR/sparql11-query/#aggregateAlgebra
 * @author Thomas Minier
 */
export default {
  'count': function (variable: rdf.Variable, rows: BindingGroup): rdf.Term {
    let count: number = 0
    if (rows.has(variable.value)) {
      count = rows.get(variable.value)!.map((v: rdf.Term) => v !== null).length
    }
    return rdf.createInteger(count)
  },
  'sum': function (variable: rdf.Variable, rows: BindingGroup): rdf.Term {
    let sum = 0
    if (rows.has(variable.value)) {
      sum = rows.get(variable.value)!.reduce((acc: number, b: rdf.Term) => {
        if (rdf.isLiteral(b) && rdf.literalIsNumeric(b)) {
          return acc + rdf.asJS(b.value, b.datatype.value)
        }
        return acc
      }, 0)
    }
    return rdf.createInteger(sum)
  },

  'avg': function (variable: rdf.Variable, rows: BindingGroup): rdf.Term {
    let avg = 0
    if (rows.has(variable.value)) {
      avg = meanBy(rows.get(variable.value)!, (term: rdf.Term) => {
        if (rdf.isLiteral(term) && rdf.literalIsNumeric(term)) {
          return rdf.asJS(term.value, term.datatype.value)
        }
      })
    }
    return rdf.createInteger(avg)
  },

  'min': function (variable: rdf.Variable, rows: BindingGroup): rdf.Term {
    return minBy(rows.get(variable.value)!, (v: rdf.Term) => {
      if (rdf.isLiteral(v)) {
        return rdf.asJS(v.value, v.datatype.value)
      }
      return v.value
    }) || rdf.createInteger(-1)
  },

  'max': function (variable: rdf.Variable, rows: BindingGroup): rdf.Term {
    return maxBy(rows.get(variable.value)!, (v: rdf.Term) => {
      if (rdf.isLiteral(v)) {
        return rdf.asJS(v.value, v.datatype.value)
      }
      return v.value
    }) || rdf.createInteger(-1)
  },

  'group_concat': function (variable: rdf.Variable, rows: BindingGroup, sep: string): rdf.Term {
    const value = rows.get(variable.value)!.map((v: rdf.Term) => v.value).join(sep)
    return rdf.createLiteral(value)
  },

  'sample': function (variable: rdf.Variable, rows: BindingGroup): rdf.Term {
    return sample(rows.get(variable.value)!)!
  }
}
