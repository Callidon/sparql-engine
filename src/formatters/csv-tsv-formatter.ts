/* file : csv-tsv-formatter.ts
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
import { isBoolean } from 'lodash'

/**
 * Write the headers and generate an ordering
 * @private
 * @param bindings - Input bindings
 * @param separator - Separator to use
 * @param input - Output where to write results
 * @return The order of variables in the header
 */
function writeHead (bindings: Bindings, separator: string, input: StreamPipelineInput<string>): string[] {
  const variables = Array.from(bindings.variables())
    .map(v => v.startsWith('?') ? v.substring(1) : v)
  input.next(variables.join(separator))
  input.next('\n')
  return variables
}

/**
 * Write a set of bindings as CSV/TSV
 * @private
 * @param bindings - Input bindings
 * @param separator - Separator to use
 * @param input - Output where to write results
 */
function writeBindings (bindings: Bindings, separator: string, order: string[], input: StreamPipelineInput<string>): void {
  let output: string[] = []
  order.forEach(variable => {
    if (bindings.has('?' + variable)) {
      let value = bindings.get('?' + variable)!
      output.push(value)
    }
  })
  input.next(output.join(separator))
}

/**
 * Create a function that formats query solutions in CSV/TSV using a separator
 * @author Thomas Minier
 * @param separator - Separator to use
 * @return A function that formats query results in a pipeline fashion
 */
function genericFormatter (separator: string) {
  return (source: PipelineStage<Bindings | boolean>): PipelineStage<string> => {
    return Pipeline.getInstance().fromAsync(input => {
      let warmup = true
      let isAsk = false
      let ordering: string[] = []
      source.subscribe((b: Bindings | boolean) => {
        // Build the head attribute from the first set of bindings
        if (warmup && !isBoolean(b)) {
          ordering = writeHead(b, separator, input)
        } else if (warmup && isBoolean(b)) {
          isAsk = true
          input.next('boolean\n')
        }
        warmup = false
        // handle results (boolean for ASK queries, bindings for SELECT queries)
        if (isBoolean(b)) {
          input.next(b ? 'true\n' : 'false\n')
        } else {
          writeBindings(b, separator, ordering, input)
          input.next('\n')
        }
      }, err => console.error(err), () => {
        input.complete()
      })
    })
  }
}

/**
 * Formats query solutions (bindings or booleans) from a PipelineStage in W3C SPARQL CSV format
 * @see https://www.w3.org/TR/2013/REC-sparql11-results-csv-tsv-20130321/
 * @author Thomas Minier
 * @param source - Input pipeline
 * @return A pipeline that yields results in W3C SPARQL CSV format
 */
export const csvFormatter = genericFormatter(',')

/**
 * Formats query solutions (bindings or booleans) from a PipelineStage in W3C SPARQL TSV format
 * @see https://www.w3.org/TR/2013/REC-sparql11-results-csv-tsv-20130321/
 * @author Thomas Minier
 * @param source - Input pipeline
 * @return A pipeline that yields results in W3C SPARQL TSV format
 */
export const tsvFormatter = genericFormatter('\t')
