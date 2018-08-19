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

/**
 * SPARQL Aggregation operations.
 * Each operation takes an arguments a SPARQL variable and a row of bindings, i.e., a list of
 * solutions bindings on which the aggregation must be applied.
 * Each operations is expected to return a term, as with classic SPARQL operations
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
const SPARQL_AGGREGATES = {
  'count': function (variable, row) {
    let count = 0
    row.forEach(bindings => {
      if (variable in bindings) {
        count++
      }
    })
    return terms.NumericOperation(count, XSD('integer'))
  }
}

module.exports = SPARQL_AGGREGATES
