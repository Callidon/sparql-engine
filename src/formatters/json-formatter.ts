/* file : json-formatter.ts
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

import { PipelineStage, StreamPipelineInput } from '../engine/pipeline/pipeline-engine'
import { Pipeline } from '../engine/pipeline/pipeline'
import { Bindings } from '../rdf/bindings'
import { rdf } from '../utils'
import { isBoolean } from 'lodash'

/**
 * Write the JSON headers
 * @private
 * @param bindings - Input bindings
 * @param input - Output where to write results
 */
function writeHead (bindings: Bindings, input: StreamPipelineInput<string>) {
  const variables = Array.from(bindings.variables())
  .map(v => v.startsWith('?') ? `"${v.substring(1)}"` : `"${v}"`)
  .join(',')
  input.next(`"head":{"vars": [${variables}]}`)
}

/**
 * Write a set of bindings as JSON
 * @private
 * @param bindings - Input bindings
 * @param input - Output where to write results
 */
function writeBindings (bindings: Bindings, input: StreamPipelineInput<string>): void {
  let cpt = 0
  bindings.forEach((variable, value) => {
    if (cpt >= 1) {
      input.next(',')
    }
    input.next(`"${variable.startsWith('?') ? variable.substring(1) : variable}":`)
    const term = rdf.fromN3(value)
    if (rdf.termIsIRI(term)) {
      input.next(`{"type":"uri","value":"${term.value}"}`)
    } else if (rdf.termIsBNode(term)) {
      input.next(`{"type":"bnode","value":"${term.value}"}`)
    } else if (rdf.termIsLiteral(term)) {
      if (term.language.length > 0) {
        input.next(`{"type":"literal","value":"${term.value}","xml:lang":"${term.language}"}`)
      } else if (term.datatype) {
        input.next(`{"type":"literal","value":"${term.value}","datatype":"${term.datatype.value}"}`)
      } else {
        input.next(`{"type":"literal","value":"${term.value}"}`)
      }
    } else {
      input.error(`Invalid RDF term "${value}" encountered during JSON serialization`)
    }
    cpt++
  })
}

/**
 * Formats query solutions (bindings or booleans) from a PipelineStage in W3C SPARQL JSON format
 * @see https://www.w3.org/TR/2013/REC-sparql11-results-json-20130321/
 * @author Thomas Minier
 * @param source - Input pipeline
 * @return A pipeline that yields results in W3C SPARQL JSON format
 */
export default function jsonFormat (source: PipelineStage<Bindings | boolean>): PipelineStage<string> {
  return Pipeline.getInstance().fromAsync(input => {
    input.next('{')
    let cpt = 0
    let isAsk = false
    source.subscribe((b: Bindings | boolean) => {
      // Build the head attribute from the first set of bindings
      if (cpt === 0 && !isBoolean(b)) {
        writeHead(b, input)
        input.next(',"results": {"bindings": [')
      } else if (cpt === 0 && isBoolean(b)) {
        isAsk = true
        input.next('"boolean":')
      } else if (cpt >= 1) {
        input.next(',')
      }
      // handle results (boolean for ASK queries, bindings for SELECT queries)
      if (isBoolean(b)) {
        input.next(b ? 'true' : 'false')
      } else {
        input.next('{')
        writeBindings(b, input)
        input.next('}')
      }
      cpt++
    }, err => console.error(err), () => {
      input.next(isAsk ? '}' : ']}}')
      input.complete()
    })
  })
}
