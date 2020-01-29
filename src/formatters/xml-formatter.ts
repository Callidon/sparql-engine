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
import { Term } from 'rdf-js'
import { map, isBoolean, isNull, isUndefined } from 'lodash'
import * as xml from 'xml'

type RDFBindings = { [key: string]: Term }

function _writeBoolean (input: boolean, root: any) {
  root.push({ boolean: input })
}

function _writeBindings (input: Bindings, results: any) {
  // convert sets of bindings into objects of RDF Terms
  let bindings: RDFBindings = input.filter(value => !isNull(value[1]) && !isUndefined(value[1]))
    .reduce((obj, variable, value) => {
      obj[variable] = rdf.fromN3(value)
      return obj
    }, {})

  // Write the result tag for this set of bindings
  results.push({
    result: map(bindings, (value, variable) => {
      let xmlTag
      if (rdf.termIsIRI(value)) {
        xmlTag = { uri: value.value }
      } else if (rdf.termIsBNode(value)) {
        xmlTag = { bnode: value.value }
      } else if (rdf.termIsLiteral(value)) {
        if (value.language === '') {
          xmlTag = { literal: [
            { _attr: { 'xml:lang': value.language } },
            value.value
          ]}
        } else {
          xmlTag = { literal: [
            { _attr: { datatype: value.datatype.value } },
            value.value
          ]}
        }
      } else {
        throw new Error(`Unsupported RDF Term type: ${value}`)
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
  const results = xml.element({})
  const root = xml.element({
    _attr: { xmlns: 'http://www.w3.org/2005/sparql-results#' },
    results: results
  })
  const stream: any = xml({ sparql: root }, { stream: true, indent: '\t', declaration: true })
  return Pipeline.getInstance().fromAsync(input => {
    // manually pipe the xml stream's results into the pipeline
    stream.on('error', (err: Error) => input.error(err))
    stream.on('end', () => input.complete())

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

    // consume the xml stream
    stream.on('data', (x: any) => input.next(x))
  })
}
