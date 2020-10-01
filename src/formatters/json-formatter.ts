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

import { PipelineStage } from '../engine/pipeline/pipeline-engine'
import { Pipeline } from '../engine/pipeline/pipeline'
import { Bindings } from '../rdf/bindings'
import { rdf } from '../utils'
import { Term } from 'rdf-js'
import { map, isBoolean, isNull, isUndefined } from 'lodash'

/**
 * Formats query solutions (bindings or booleans) from a PipelineStage in W3C SPARQL JSON format
 * @see https://www.w3.org/TR/2013/REC-sparql11-results-json-20130321/
 * @author Thomas Minier
 * @param source - Input pipeline
 * @return A pipeline s-that yields results in W3C SPARQL XML format
 */
export default function jsonFormat (source: PipelineStage<Bindings | boolean>): PipelineStage<string> {
  return Pipeline.getInstance().fromAsync(input => {

    let warmup = true
    source.subscribe((b: Bindings | boolean) => {
      // Build the head attribute from the first set of bindings
      if (warmup && !isBoolean(b)) {
        
        warmup = false
      }
      // handle results (boolean for ASK queries, bindings for SELECT queries)
      if (isBoolean(b)) {
        
      } else {
        
      }
    }, err => console.error(err), () => {
      
    })
  })
}
