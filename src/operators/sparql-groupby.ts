/* file : sparql-groupby.ts
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

import { sortedIndexOf } from 'lodash'
import { PipelineStage } from '../engine/pipeline/pipeline-engine.js'
import { Pipeline } from '../engine/pipeline/pipeline.js'
import { BindingGroup, Bindings } from '../rdf/bindings.js'
import { rdf } from '../utils/index.js'

/**
 * Hash functions for set of bindings
 * @private
 * @param  variables - SPARQL variables to hash
 * @param  bindings  - Set of bindings to hash
 * @return Hashed set of bindings
 */
function _hashBindings(variables: rdf.Variable[], bindings: Bindings): string {
  // if no GROUP BY variables are used (in the case of an empty GROUP BY)
  // then we use a default grouping key
  if (variables.length === 0) {
    return 'http://callidon.github.io/sparql-engine#DefaultGroupKey'
  }
  return variables
    .map((v) => {
      if (bindings.has(v)) {
        return bindings.get(v)!.value
      }
      return 'null'
    })
    .join(';')
}

/**
 * Apply a SPARQL GROUP BY clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#groupby}
 * @author Thomas Minier
 * @param source - Input {@link PipelineStage}
 * @param variables - GROUP BY variables
 * @return A {@link PipelineStage} which evaluate the GROUP BY operation
 */
export default function sparqlGroupBy(
  source: PipelineStage<Bindings>,
  variables: rdf.Variable[],
) {
  const groups: Map<string, BindingGroup> = new Map()
  const keys: Map<string, Bindings> = new Map()
  const engine = Pipeline.getInstance()
  const groupVariables = variables.sort()
  const op = engine.map(source, (bindings: Bindings) => {
    const key = _hashBindings(variables, bindings)
    // create a new group is needed
    if (!groups.has(key)) {
      keys.set(
        key,
        bindings.filter(
          (variable) =>
            sortedIndexOf(
              groupVariables.map((gv) => gv.value),
              variable.value,
            ) > -1,
        ),
      )
      groups.set(key, new Map())
    }
    // parse each binding in the intermediate format used by SPARQL expressions
    // and insert it into the corresponding group
    bindings.forEach((variable, value) => {
      if (!groups.get(key)!.has(variable.value)) {
        groups.get(key)!.set(variable.value, [value])
      } else {
        groups.get(key)!.get(variable.value)!.push(value)
      }
    })
    return null
  })
  return engine.mergeMap(engine.collect(op), () => {
    const aggregates: Bindings[] = []
    // transform each group in a set of bindings
    groups.forEach((group, key) => {
      // also add the GROUP BY keys to the set of bindings
      const b = keys.get(key)!.clone()
      b.setProperty('__aggregate', group)
      aggregates.push(b)
    })
    return engine.from(aggregates)
  })
}
