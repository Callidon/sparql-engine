/* file : select.ts
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

import { Pipeline } from '../../engine/pipeline/pipeline'
import { PipelineStage } from '../../engine/pipeline/pipeline-engine'
import { Algebra } from 'sparqljs'
import { rdf } from '../../utils'
import { Bindings } from '../../rdf/bindings'

/**
 * Evaluates a SPARQL SELECT operation, i.e., perform a selection over sets of solutions bindings
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#select}
 * @author Thomas Minier
 * @author Corentin Marionneau
 * @param source - Input {@link PipelineStage}
 * @param query - SELECT query
 * @return A {@link PipelineStage} which evaluate the SELECT modifier
 */
export default function select (source: PipelineStage<Bindings>, query: Algebra.RootNode) {
  const variables = <string[]> query.variables
  const selectAll = variables.length === 1 && variables[0] === '*'
  return Pipeline.getInstance().map(source, (bindings: Bindings) => {
    if (!selectAll) {
      bindings = variables.reduce((obj, v) => {
        if (bindings.has(v)) {
          obj.set(v, bindings.get(v)!)
        } else {
          obj.set(v, 'UNBOUND')
        }
        return obj
      }, bindings.empty())
    }
    return bindings.mapValues((k, v) => rdf.isVariable(k) && typeof v === 'string' ? v : null)
  })
}
