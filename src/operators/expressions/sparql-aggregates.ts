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

import { rdf } from '../../utils'
import { maxBy, meanBy, minBy, sample } from 'lodash'
import { Term } from 'rdf-js'

type TermRows = { [key: string]: Term[] }

/**
 * SPARQL Aggregation operations.
 * Each operation takes an arguments a SPARQL variable and a row of bindings, i.e., a list of
 * solutions bindings on which the aggregation must be applied.
 * Each operations is expected to return a term, as with classic SPARQL operations
 * @see https://www.w3.org/TR/sparql11-query/#aggregateAlgebra
 * @author Thomas Minier
 */
export default {
  'count': function (variable: string, rows: TermRows): Term {
    let count: number = 0
    if (variable in rows) {
      count = rows[variable].map((v: Term) => v !== null).length
    }
    return rdf.createInteger(count)
  },
  'sum': function (variable: string, rows: TermRows): Term {
    let sum = 0
    if (variable in rows) {
      sum = rows[variable].reduce((acc: number, b: Term) => {
        if (rdf.termIsLiteral(b) && rdf.literalIsNumeric(b)) {
          return acc + rdf.asJS(b.value, b.datatype.value)
        }
        return acc
      }, 0)
    }
    return rdf.createInteger(sum)
  },

  'avg': function (variable: string, rows: TermRows): Term {
    let avg = 0
    if (variable in rows) {
      avg = meanBy(rows[variable], (term: Term) => {
        if (rdf.termIsLiteral(term) && rdf.literalIsNumeric(term)) {
          return rdf.asJS(term.value, term.datatype.value)
        }
      })
    }
    return rdf.createInteger(avg)
  },

  'min': function (variable: string, rows: TermRows): Term {
    return minBy(rows[variable], (v: Term) => {
      if (rdf.termIsLiteral(v)) {
        return rdf.asJS(v.value, v.datatype.value)
      }
      return v.value
    }) || rdf.createInteger(-1)
  },

  'max': function (variable: string, rows: TermRows): Term {
    return maxBy(rows[variable], (v: Term) => {
      if (rdf.termIsLiteral(v)) {
        return rdf.asJS(v.value, v.datatype.value)
      }
      return v.value
    }) || rdf.createInteger(-1)
  },

  'group_concat': function (variable: string, rows: TermRows, sep: string): Term {
    const value = rows[variable].map((v: Term) => v.value).join(sep)
    return rdf.createLiteral(value)
  },

  'sample': function (variable: string, rows: TermRows): Term {
    return sample(rows[variable])!
  }
}
