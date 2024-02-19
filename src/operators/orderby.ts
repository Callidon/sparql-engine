/* file : orderby.ts
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

import * as SPARQL from 'sparqljs'
import { PipelineStage } from '../engine/pipeline/pipeline-engine.js'
import { Pipeline } from '../engine/pipeline/pipeline.js'
import { Bindings } from '../rdf/bindings.js'
import { rdf } from '../utils/index.js'

/**
 * Build a comparator function from an ORDER BY clause content
 * @private
 * @param  comparators - ORDER BY comparators
 * @return A comparator function
 */
function _compileComparators(comparators: SPARQL.Ordering[]) {
  const comparatorsFuncs = comparators.map((c: SPARQL.Ordering) => {
    return (left: Bindings, right: Bindings) => {
      const variable = c.expression as rdf.Variable
      if (left.get(variable)!.value < right.get(variable)!.value) {
        return c.descending ? 1 : -1
      } else if (left.get(variable)!.value > right.get(variable)!.value) {
        return c.descending ? -1 : 1
      }
      return 0
    }
  })
  return (left: Bindings, right: Bindings) => {
    let temp
    for (const comp of comparatorsFuncs) {
      temp = comp(left, right)
      if (temp !== 0) {
        return temp
      }
    }
    return 0
  }
}

/**
 * A OrderByOperator implements a ORDER BY clause, i.e.,
 * it sorts solution mappings produced by another operator
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modOrderBy}
 * @author Thomas Minier
 * @param source - Input {@link PipelineStage}
 * @param comparators - Set of ORDER BY comparators
 * @return A {@link PipelineStage} which evaluate the ORDER BY operation
 */
export default function orderby(
  source: PipelineStage<Bindings>,
  comparators: SPARQL.Ordering[],
) {
  const comparator = _compileComparators(
    comparators.map((c: SPARQL.Ordering) => {
      // explicity tag ascending comparators (sparqljs leaves them untagged)
      if (!('descending' in c)) {
        c.descending = false
      }
      return c
    }),
  )
  const engine = Pipeline.getInstance()
  return engine.mergeMap(engine.collect(source), (values: Bindings[]) => {
    values.sort((a, b) => comparator(a, b))
    return engine.from(values)
  })
}
