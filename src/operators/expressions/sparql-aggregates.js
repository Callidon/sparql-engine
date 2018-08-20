/* file : sparql-aggregates.js
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

const { XSD } = require('../../utils.js').rdf
const terms = require('../../rdf-terms.js')
const { maxBy, meanBy, minBy, sample } = require('lodash')

/**
 * SPARQL Aggregation operations.
 * Each operation takes an arguments a SPARQL variable and a row of bindings, i.e., a list of
 * solutions bindings on which the aggregation must be applied.
 * Each operations is expected to return a term, as with classic SPARQL operations
 * @see https://www.w3.org/TR/sparql11-query/#aggregateAlgebra
 * @author Thomas Minier
 */
const SPARQL_AGGREGATES = {
  'count': function (variable, rows) {
    let count = 0
    if (variable in rows) {
      count = rows[variable].map(v => v !== null).length
    }
    return terms.NumericOperation(count, XSD('integer'))
  },

  'sum': function (variable, rows) {
    let sum = 0
    if (variable in rows) {
      sum = rows[variable].reduce((acc, b) => {
        return acc + b.asJS
      }, 0)
    }
    return terms.NumericOperation(sum, XSD('integer'))
  },

  'avg': function (variable, rows) {
    let avg = 0
    if (variable in rows) {
      avg = meanBy(rows[variable], v => v.asJS)
    }
    return terms.NumericOperation(avg, XSD('integer'))
  },

  'min': function (variable, rows) {
    return minBy(rows[variable], v => v.asJS)
  },

  'max': function (variable, rows) {
    return maxBy(rows[variable], v => v.asJS)
  },

  'group_concat': function (variable, rows, sep) {
    const value = rows[variable].map(v => v.value).join(sep)
    return terms.RawLiteralDescriptor(value)
  },

  'sample': function (variable, rows) {
    return sample(rows[variable])
  }
}

module.exports = SPARQL_AGGREGATES
