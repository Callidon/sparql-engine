/* file : sparql-aggregates.ts
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

import { rdf } from '../../utils'
import { terms } from '../../rdf-terms'
import { maxBy, meanBy, minBy, sample } from 'lodash'

/**
 * SPARQL Aggregation operations.
 * Each operation takes an arguments a SPARQL variable and a row of bindings, i.e., a list of
 * solutions bindings on which the aggregation must be applied.
 * Each operations is expected to return a term, as with classic SPARQL operations
 * @see https://www.w3.org/TR/sparql11-query/#aggregateAlgebra
 * @author Thomas Minier
 */
export default {
  'count': function (variable: string, rows: Object[]): terms.RDFTerm {
    let count: number = 0
    if (variable in rows) {
      count = rows[variable].map((v: string[]) => v !== null).length
    }
    return terms.createNumber(count, rdf.XSD('integer'))
  },

  'sum': function (variable: string, rows: Object[]): terms.RDFTerm {
    let sum = 0
    if (variable in rows) {
      sum = rows[variable].reduce((acc: number, b: terms.RDFTerm) => {
        return acc + b.asJS
      }, 0)
    }
    return terms.createNumber(sum, rdf.XSD('integer'))
  },

  'avg': function (variable: string, rows: Object[]): terms.RDFTerm {
    let avg = 0
    if (variable in rows) {
      avg = meanBy(rows[variable], (v: terms.RDFTerm) => v.asJS)
    }
    return terms.createNumber(avg, rdf.XSD('integer'))
  },

  'min': function (variable: string, rows: Object[]): terms.RDFTerm {
    return minBy(rows[variable], (v: terms.RDFTerm) => v.asJS) || terms.createNumber(-1, rdf.XSD('integer'))
  },

  'max': function (variable: string, rows: Object[]): terms.RDFTerm {
    return maxBy(rows[variable], (v: terms.RDFTerm) => v.asJS) || terms.createNumber(-1, rdf.XSD('integer'))
  },

  'group_concat': function (variable: string, rows: Object[], sep: string): terms.RDFTerm {
    const value = rows[variable].map((v: terms.RDFTerm) => v.value).join(sep)
    return terms.createLiteral(value)
  },

  'sample': function (variable: string, rows: Object[]): terms.RDFTerm {
    return sample(rows[variable])
  }
}
