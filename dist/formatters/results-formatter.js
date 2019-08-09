"use strict";
// /* file : results-formatter.js
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
// import { AsyncIterator, TransformIterator } from 'asynciterator'
// import { rdf } from '../utils'
// import { isBoolean } from 'lodash'
// import { Bindings } from '../rdf/bindings'
// import { RDFTerm } from '../rdf-terms'
//
// /**
//  * Abstract class to serialize solution bindings into valid SPARQL results
//  * @abstract
//  * @extends TransformIterator
//  * @author Thomas Minier
//  * @author Corentin Marionneau
//  */
// export default abstract class ResultsFormatter<T> extends TransformIterator<Bindings | boolean, T> {
//   private readonly _variables: string[]
//   private _empty: boolean
//
//   /**
//    * Constructor
//    * @param source  - Source iterator
//    * @param variables - Query variables
//    * @param options - Execution options
//    */
//   constructor (source: AsyncIterator<Bindings | boolean>, variables: any, options: Object = {}) {
//     super(source, options)
//     this._empty = true
//     this._variables = variables.map((v: any) => {
//       if (typeof v === 'object') {
//         while (v.variable === null) {
//           v = v.expression
//         }
//         return v.variable
//       } else {
//         return v
//       }
//     })
//   }
//
//   /**
//    * Return true if the source iterator has yield no results
//    * @return True if the source iterator has yield no results
//    */
//   get empty (): boolean {
//     return this._empty
//   }
//
//   _begin (done: () => void): void {
//     this._writeHead(this._variables.map(v => v.substring(1)), done)
//   }
//
//   /**
//    * Called to append any "heading" data to the results.
//    * Implementers must call `this._push()` to write data.
//    * @param variables - SPARQL variables found in the query
//    * @param done - To be called when writing is complete
//    */
//   _writeHead (variables: string[], done: () => void): void {
//     done()
//   }
//
//   /**
//    * Write a set of bindings in the output format.
//    * Implementers must call `this._push()` to push values in the iterators.
//    * @param result - Tuple [variable, value] to be transformed into the output format
//    * @param done - To be called when writing is complete
//    */
//   abstract _writeBindings (result: [string, RDFTerm], done: () => void): void
//
//   /**
//    * Write a boolean result in the output format.
//    * Implementers must call `this._push()` to push values in the iterators.
//    * @param result - Boolean result
//    * @param done - To be called when writing is complete
//    */
//   abstract _writeBoolean (result: boolean, done: () => void): void
//
//   _transform (bindings: Bindings | boolean, done: () => void): void {
//     if (isBoolean(bindings)) {
//       this._writeBoolean(bindings, done)
//     } else {
//       // convert bindings values in intermediate format before processing
//       this._writeBindings(bindings.reduce((acc: any, variable: string, value: string) => {
//         if (value !== null) {
//           return acc.concat([variable, rdf.parseTerm(value)])
//         }
//         return acc
//       }, []), done)
//     }
//     this._empty = false
//   }
// }
