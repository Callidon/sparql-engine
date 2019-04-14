/* file : sparql-distinct.ts
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
import { Bindings } from '../rdf/bindings'

/**
 * Hash an set of mappings and produce an unique value
 * @private
 * @param item - The item to hash
 * @return An unique hash which identify the item
 */
function _hash (bindings: Bindings): string {
  const items: string[] = []
  bindings.forEach((k: string, v: string) => items.push(`${k}=${encodeURIComponent(v)}`))
  items.sort()
  return items.join('&')
}

/**
 * Applies a DISTINCT modifier on the output of another operator.
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modDuplicates}
 * @author Thomas Minier
 * @param source - Input {@link PipelineStage}
 * @return A {@link PipelineStage} which evaluate the DISTINCT operation
 */
export default function sparqlDistinct (source: PipelineStage<Bindings>) {
  return Pipeline.getInstance().distinct(source, (bindings: Bindings) => _hash(bindings))
}
