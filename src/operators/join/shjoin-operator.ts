// /* file : shjoin-operator.ts
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
// import { AsyncIterator, ArrayIterator, EmptyIterator, MultiTransformIterator } from 'asynciterator'
// import UnionIterator from '../union-operator'
// import { Bindings } from '../../rdf/bindings'
// import { Algebra } from 'sparqljs'
//
// export type BindingsMap = Map<string, Bindings[]>
//
// /**
//  * HalfHashJoinOperator is an operator that performs half of an Hash Join
//  * between a source of mappings and a hash table
//  * @extends MultiTransformIterator
//  * @private
//  * @author Thomas Minier
//  */
// class HalfHashJoinOperator extends MultiTransformIterator<Bindings,Bindings> {
//   private readonly _joinKey: string
//   private readonly _innerHashTable: BindingsMap
//   private readonly _outerHashTable: BindingsMap
//
//   constructor (joinKey: string, innerSource: AsyncIterator<Bindings>, innerHashTable: BindingsMap, outerHashTable: BindingsMap) {
//     super(innerSource)
//     this._joinKey = joinKey
//     this._innerHashTable = innerHashTable
//     this._outerHashTable = outerHashTable
//   }
//
//   _createTransformer (bindings: Bindings): AsyncIterator<Bindings> {
//     if (!(bindings.has(this._joinKey))) {
//       return new EmptyIterator()
//     }
//     const key = bindings.get(this._joinKey)!
//
//     if (this._innerHashTable.has(key)) {
//       const prevMappings = this._innerHashTable.get(key)!
//       this._innerHashTable.set(key, prevMappings.concat(bindings))
//     } else {
//       this._innerHashTable.set(key, [bindings])
//     }
//     if (this._outerHashTable.has(key)) {
//       const rightMappings = this._outerHashTable.get(key)
//       return new ArrayIterator(rightMappings!.map((item: Bindings) => {
//         return item.union(bindings)
//       }))
//     }
//     return new EmptyIterator()
//   }
// }
//
// /**
//  * A SHJoinOperator perform a Symmetric Hash Join between two sources of mappings
//  * @memberof module:Operators
//  * @extends module:Operators.UnionIterator
//  * @author Thomas Minier
//  */
// export default class SHJoinOperator extends UnionIterator<Bindings> {
//   private readonly _joinKey: string
//   private readonly _leftPattern: Algebra.TripleObject
//   private readonly _rightPattern: Algebra.TripleObject
//   private readonly _leftHashTable: BindingsMap
//   private readonly _rightHashTable: BindingsMap
//   /**
//    * Constructor
//    * @param {string} joinKey - The join attribute
//    * @param {AsyncIterator} leftSource - An iterator that emits mappings from the external relation
//    * @param {AsyncIterator} rightSource - An iterator that emits mappings from the internal relation
//    * @param {Object} leftPattern - The triple pattern matching the external relation
//    * @param {Object} rightPattern - The triple pattern matching the internal relation
//    */
//   constructor (joinKey: string, leftSource: AsyncIterator<Bindings>, rightSource: AsyncIterator<Bindings>, leftPattern: Algebra.TripleObject, rightPattern: Algebra.TripleObject) {
//     const leftHashTable = new Map()
//     const rightHashTable = new Map()
//     const left = new HalfHashJoinOperator(joinKey, leftSource, leftHashTable, rightHashTable)
//     const right = new HalfHashJoinOperator(joinKey, rightSource, rightHashTable, leftHashTable)
//     super(left, right)
//     this._joinKey = joinKey
//     this._leftPattern = leftPattern
//     this._rightPattern = rightPattern
//     this._leftHashTable = leftHashTable
//     this._rightHashTable = rightHashTable
//   }
// }
