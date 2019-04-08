/* file : sparql-groupby.ts
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

import { Pipeline } from '../engine/pipeline/pipeline'
import { PipelineStage } from '../engine/pipeline/pipeline-engine'
import { rdf } from '../utils'
import { Bindings } from '../rdf/bindings'

/**
 * Build a new aggregate group from a set of SPARQL variables
 * @param variables - Set of SPARQL variables
 * @return A new aggregate group
 */
function buildNewGroup (variables: string[]): Object {
  return variables.reduce((rows, v) => {
    rows[v] = []
    return rows
  }, {})
}

/**
 * Hash functions for set of bindings
 * @private
 * @param  variables - SPARQL variables to hash
 * @param  bindings  - Set of bindings to hash
 * @return Hashed set of bindings
 */
function _hashBindings (variables: string[], bindings: Bindings): string {
  return variables.map(v => {
    if (bindings.has(v)) {
      return bindings.get(v)
    }
    return 'null'
  }).join(';')
}

/**
 * Apply a SPARQL GROUP BY clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#groupby}
 * @author Thomas Minier
 * @param source - Input {@link PipelineStage}
 * @param variables - GROUP BY variables
 * @return A {@link PipelineStage} which evaluate the GROUP BY operation
 */
export default function sparqlGroupBy (source: PipelineStage<Bindings>, variables: string[]) {
  const groups: Map<string, any> = new Map()
  const keys: Map<string, Bindings> = new Map()
  const engine = Pipeline.getInstance()
  let op = engine.map(source, (bindings: Bindings) => {
    const key = _hashBindings(variables, bindings)
      // create a new group is needed
      if (!groups.has(key)) {
        keys.set(key, bindings.filter(variable => variables.indexOf(variable) > -1))
        groups.set(key, buildNewGroup(Array.from(bindings.variables())))
      }
      // parse each binding in the intermediate format used by SPARQL expressions
      // and insert it into the corresponding group
      bindings.forEach((variable, value) => {
        groups.get(key)[variable].push(rdf.parseTerm(value))
      })
      return null
  })
  return engine.mergeMap(engine.collect(op), () => {
    const aggregates: any[] = []
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
