/* file : custom-aggregations.ts
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

import { Term } from 'rdf-js'
import { rdf } from '../../utils'
import { isUndefined, sum, zip } from 'lodash'

type TermRows = { [key: string]: Term[] }

/**
 * Implementation of Non standard SPARQL aggregations offered by the framework
 * All arguments are pre-compiled from string to RDF.js terms
 * @author Thomas Minier
 */
export default {
  /*
    Accuracy metrics, often used in machine learning
  */

  // Accuracy: computes percentage of times two variables have different values
  // In regular SPARQL, equivalent to sum(if(?a = ?b, 1, 0)) / count(*)
  'https://callidon.github.io/sparql-engine/aggregates#ACCURACY': function (a: string, b: string, rows: TermRows): Term {
    const tests = zip(rows[a], rows[b]).map(v => {
      if (isUndefined(v[0]) || isUndefined(v[1])) {
        return 0
      }
      return rdf.termEquals(v[0], v[1]) ? 1 : 0
    })
    return rdf.createFloat(sum(tests) / tests.length)
  }
}
