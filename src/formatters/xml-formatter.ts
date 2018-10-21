// /* file : xml-formatter.ts
// MIT License
//
// Copyright (c) 2018 Thomas Minier
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// */
//
// 'use strict'
//
// import { AsyncIterator } from 'asynciterator'
// import ResultsFormatter from './results-formatter'
// import xml from 'xml'
// import { map, isNull, isUndefined } from 'lodash'
// import { Bindings } from '../rdf/bindings'
// import { RDFTerm } from '../rdf-terms'
//
// /**
//  * Formats results in XML format
//  * @see https://www.w3.org/TR/2013/REC-rdf-sparql-XMLres-20130321/
//  * @extends ResultsFormatter
//  * @author Thomas Minier
//  * @author Corentin Marionneau
//  */
// export default class XMLFormatter extends ResultsFormatter<string> {
//   private readonly _root: any
//   private readonly _results: any
//   private readonly _stream: any
//
//   constructor (source: AsyncIterator<Bindings | boolean>, variables: any[], options: Object) {
//     super(source, variables, options)
//     this._root = xml.element({
//       _attr: { xmlns: 'http://www.w3.org/2005/sparql-results#' }
//     })
//     this._results = xml.element({})
//     this._stream = xml({ sparql: this._root }, { stream: true, indent: '\t', declaration: true })
//     this._stream.on('data', (v: string) => this._push(v))
//   }
//
//   _writeHead (variableNames: string[], done: () => void): void {
//     // Write head element
//     if (variableNames.length > 0 && variableNames[0] !== '*') {
//       this._root.push({
//         head: variableNames.map(name => {
//           return { variable: { _attr: { name } } }
//         })
//       })
//     }
//     // Write the results tag
//     this._root.push({
//       results: this._results
//     })
//     done()
//   }
//
//   _writeBindings (input: [string, RDFTerm], done: () => void): void {
//     // remove null & undefined values
//     let bindings: any = input.filter(value => !isNull(value[1]) && !isUndefined(value[1]))
//       .reduce((obj, value) => {
//         obj[value[0]] = value[1]
//         return obj
//       }, {})
//
//     // Write the result tag for this set of bindings
//     this._results.push({
//       result: map(bindings, (value, variable) => {
//         let xmlTag
//         switch (value.type) {
//           case 'iri':
//             xmlTag = { uri: value.value }
//             break
//           case 'bnode':
//             xmlTag = { bnode: value.value }
//             break
//           case 'literal':
//             xmlTag = { literal: value.value }
//             break
//           case 'literal+type':
//             xmlTag = { literal: [
//               { _attr: { datatype: value.datatype } },
//               value.value
//             ]}
//             break
//           case 'literal+lang':
//             xmlTag = { literal: [
//               { _attr: { 'xml:lang': value.lang } },
//               value.value
//             ]}
//             break
//           default:
//             throw new Error(`Unsupported bindings type: ${value.type}`)
//         }
//         return {
//           binding: [
//             { _attr: { name: variable.substring(1) } },
//             xmlTag
//           ]
//         }
//       })
//     })
//     done()
//   }
//
//   _writeBoolean (result: Object, done: () => void): void {
//     this._root.push({ boolean: result })
//     done()
//   }
//
//   _flush (done: () => void): void {
//     this._results.close()
//     this._root.close()
//     done()
//   }
// }
