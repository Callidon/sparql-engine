/* file : xml-formatter.ts
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
import { map, isBoolean, isNull, isUndefined } from 'lodash'
import xml from 'xml'

function _writeBoolean (input: boolean, root: any) {
  root.push({ boolean: input })
}

function _writeBindings (input: Bindings, results: any) {
  // convert sets of bindings into objects of RDF Terms
  let bindings: any = input.filter(value => !isNull(value[1]) && !isUndefined(value[1]))
    .reduce((obj, value) => {
      obj[value[0]] = rdf.parseTerm(value[1])
      return obj
    }, {})

  // Write the result tag for this set of bindings
  results.push({
    result: map(bindings, (value, variable) => {
      let xmlTag
      switch (value.type) {
        case 'iri':
          xmlTag = { uri: value.value }
          break
        case 'bnode':
          xmlTag = { bnode: value.value }
          break
        case 'literal':
          xmlTag = { literal: value.value }
          break
        case 'literal+type':
          xmlTag = { literal: [
            { _attr: { datatype: value.datatype } },
            value.value
          ]}
          break
        case 'literal+lang':
          xmlTag = { literal: [
            { _attr: { 'xml:lang': value.lang } },
            value.value
          ]}
          break
        default:
          throw new Error(`Unsupported bindings type: ${value.type}`)
      }
      return {
        binding: [
          { _attr: { name: variable.substring(1) } },
          xmlTag
        ]
      }
    })
  })
}

/**
 * Formats query solutions (bindings or booleans) from a PipelineStage in W3C SPARQL XML format
 * @see https://www.w3.org/TR/2013/REC-rdf-sparql-XMLres-20130321/
 * @author Thomas Minier
 * @author Corentin Marionneau
 * @param source - Input pipeline
 * @return A pipeline s-that yields results in W3C SPARQL XML format
 */
export default function xmlFormat (source: PipelineStage<Bindings | boolean>): PipelineStage<string> {
  const root = xml.element({
    _attr: { xmlns: 'http://www.w3.org/2005/sparql-results#' }
  })
  const results = xml.element({})
  const stream: any = xml({ sparql: root }, { stream: true, indent: '\t', declaration: true })
  const iterator: PipelineStage<string> = Pipeline.getInstance().from(stream)
  let warmup = true
  source.subscribe((b: Bindings | boolean) => {
    // Build the head attribute from the first set of bindings
    if (warmup && !isBoolean(b)) {
      const variables: string[] = Array.from(b.variables())
      root.push({
        head: variables.filter(name => name !== '*').map(name => {
          return { variable: { _attr: { name } } }
        })
      })
      warmup = false
    }
    // handle results (boolean for ASK queries, bindings for SELECT queries)
    if (isBoolean(b)) {
      _writeBoolean(b, root)
    } else {
      _writeBindings(b, results)
    }
  }, err => console.error(err), () => {
    results.close()
    root.close()
  })
  return iterator
}
