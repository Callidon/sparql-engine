/* file : bindings.ts
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

import { Algebra } from 'sparqljs'
import { isNull, isUndefined } from 'lodash'

/**
 * A set of mappings from a variable to a RDF Term.
 */
export abstract class Bindings {
  readonly _properties: Map<string, any>

  constructor () {
    this._properties = new Map()
  }

  /**
   * The number of mappings in the set
   * @return {number} The number of mappings in the set
   */
  abstract get size (): number

  /**
   * Returns True if the set is empty, False otherwise
   * @return {boolean} True if the set is empty, False otherwise
   */
  abstract get isEmpty (): boolean

  /**
   * Get an iterator over the SPARQL variables in the set
   * @return {IterableIterator<string>} An iterator over the SPARQL variables in the set
   */
  abstract variables (): IterableIterator<string>


  /**
   * Get an iterator over the RDF terms in the set
   * @return {IterableIterator<string>} An iterator over the RDF terms in the set
   */
  abstract values (): IterableIterator<string>

  /**
   * Get the RDF Term associated with a SPARQL variable
   * @param {string} variable - SPARQL variable
   * @return {string|null} The RDF Term associated with the given SPARQL variable
   */
  abstract get (variable: string): string | null

  /**
   * Test if mappings exists for a SPARQL variable
   * @param {string} variable - SPARQL variable
   * @return {boolean} True if a mappings exists for this variable, False otherwise
   */
  abstract has (variable: string): boolean

  /**
   * Add a mapping SPARQL variable -> RDF Term to the set
   * @param {string} variable - SPARQL variable
   * @param {string} value - RDF Term
   * @return {void}
   */
  abstract set (variable: string, value: string): void

  getProperty (key: string): any {
    return this._properties.get(key)
  }

  hasProperty (key: string): boolean {
    return this._properties.has(key)
  }

  setProperty (key: string, value: any): void {
    this._properties.set(key, value)
  }

  /**
   * Invoke a callback on each mapping
   * @param {function} callback - Callback to invoke
   * @return {void}
   */
  abstract forEach (callback: (variable: string, value: string) => void): void

  /**
   * Remove all mappings from the set
   * @return {void}
   */
  abstract clear (): void

  /**
   * Returns an empty set of mappings
   * @return {Bindings} An empty set of mappings
   */
  abstract empty (): Bindings

  toObject (): Object {
    return this.reduce((acc, variable, value) => {
      acc[variable] = value
      return acc
    }, {})
  }

  /**
   * Creates a deep copy of the set of mappings
   * @return {Bindings} A deep copy of the set
   */
  clone (): Bindings {
    const cloned = this.empty()
    // copy properties then values
    if (this._properties.size > 0) {
      this._properties.forEach((value, key) => {
        cloned.setProperty(key, value)
      })
    }
    this.forEach((variable, value) => {
      cloned.set(variable, value)
    })
    return cloned
  }

  /**
   * Test the equality between two sets of mappings
   * @param {Bindings} other - A set of mappings
   * @return {boolean} True if the two sets are equal, False otherwise
   */
  equals (other: Bindings): boolean {
    if (this.size !== other.size) {
      return false
    }
    for (let variable in other.variables()) {
      if (!(this.has(variable)) || (this.get(variable) !== other.get(variable))) {
        return false
      }
    }
    return true
  }

  /**
   * Bound a triple pattern using the set of mappings, i.e., substitute variables in the triple pattern
   * @param {Object} triple  - Triple pattern
   * @return {Object} An new, bounded triple pattern
   */
  bound (triple: Algebra.TripleObject): Algebra.TripleObject {
    const newTriple = Object.assign({}, triple)
    if (triple.subject.startsWith('?') && this.has(triple.subject)) {
      newTriple.subject = this.get(triple.subject)!
    }
    if (triple.predicate.startsWith('?') && this.has(triple.predicate)) {
      newTriple.predicate = this.get(triple.predicate)!
    }
    if (triple.object.startsWith('?') && this.has(triple.object)) {
      newTriple.object = this.get(triple.object)!
    }
    return newTriple
  }

  /**
   * Creates a new bindings with additionnal mappings
   * @param  {Array<[string, string]>} values - Pairs [variable, value] to add to the set
   * @return {Bindings} A new Bindings with the additionnal mappings
   */
  extendMany (values: Array<[string, string]>): Bindings {
    const cloned = this.clone()
    values.forEach(v => {
      cloned.set(v[0], v[1])
    })
    return cloned
  }

  /**
   * Perform the union of the set of mappings with another set
   * @param {Bindings} other - Set of mappings
   * @return {Bindings} The Union set of mappings
   */
  union (other: Bindings): Bindings {
    const cloned = this.clone()
    other.forEach((variable, value) => {
      cloned.set(variable, value)
    })
    return cloned
  }

  /**
   * Perform the intersection of the set of mappings with another set
   * @param {Bindings} other - Set of mappings
   * @return {Bindings} The Intersection set of mappings
   */
  intersection (other: Bindings): Bindings {
    const res = this.empty()
    this.forEach((variable, value) => {
      if (other.has(variable) && other.get(variable) === value) {
        res.set(variable, value)
      }
    })
    return res
  }

  /**
   * Creates a new set of mappings using a function to transform the current set
   * @param {function} mapper - Transformation function (variable, value) => [string, string]
   * @return {Bindings} A new set of mappings
   */
  map (mapper: (variable: string, value: string) => [string | null, string | null]): Bindings {
    const result = this.empty()
    this.forEach((variable, value) => {
      let [newVar, newValue] = mapper(variable, value)
      if (!(isNull(newVar) || isUndefined(newVar) || isNull(newValue) || isUndefined(newValue))) {
        result.set(newVar, newValue)
      }
    })
    return result
  }

  /**
   * Same as map, but only transform variables
   * @param {function} mapper - Transformation function
   * @return {Bindings} A new set of mappings
   */
  mapVariables (mapper: (variable: string, value: string) => string | null): Bindings {
    return this.map((variable, value) => [mapper(variable, value), value])
  }

  /**
   * Same as map, but only transform values
   * @param {function} mapper - Transformation function
   * @return {Bindings} A new set of mappings
   */
  mapValues (mapper: (variable: string, value: string) => string | null): Bindings {
    return this.map((variable, value) => [variable, mapper(variable, value)])
  }

  /**
   * Filter mappings from the set of mappings using a predicate function
   * @param {function} predicate - Predicate function
   * @return {Bindings} A new set of mappings
   */
  filter (predicate: (variable: string, value: string) => boolean): Bindings {
    return this.map((variable, value) => {
      if (predicate(variable, value)) {
        return [variable, value]
      }
      return [null, null]
    })
  }

  /**
   * Reduce the set of mappings to a value which is the accumulated result of running each element in collection thru a reducing function, where each successive invocation is supplied the return value of the previous.
   * @param {function} reducer - Reducing function
   * @param {T} start - Value used to start the accumulation
   * @return {T} The accumulated value
   */
  reduce<T> (reducer: (acc: T, variable: string, value: string) => T, start: T): T {
    let acc: T = start
    this.forEach((variable, value) => {
      acc = reducer(acc, variable, value)
    })
    return acc
  }
}

/**
 * A set of mappings from a variable to a RDF Term, implements using a HashMap
 */
export class BindingBase extends Bindings {
  readonly _content: Map<string, string>

  constructor () {
    super()
    this._content = new Map()
  }

  get size (): number {
    return this._content.size
  }

  get isEmpty (): boolean {
    return this.size === 0
  }

  /**
   * Creates a set of mappings from a plain Javascript Object
   * @param {Object} obj - Source object to turn into a set of mappings
   * @return {Bindings} A set of mappings
   */
  static fromObject (obj: Object): Bindings {
    const res = new BindingBase()
    for (let key in obj) {
      res.set(key, obj[key])
    }
    return res
  }

   variables (): IterableIterator<string> {
    return this._content.keys()
  }

  values (): IterableIterator<string> {
    return this._content.values()
  }

  get (variable: string): string | null {
    if (this._content.has(variable)) {
      return this._content.get(variable)!
    }
    return null
  }

  has (variable: string): boolean {
    return this._content.has(variable)
  }

  set (variable: string, value: string): void {
    this._content.set(variable, value)
  }

  clear (): void {
    this._content.clear()
  }

  empty (): Bindings {
    return new BindingBase()
  }

  forEach (callback: (variable: string, value: string) => void): void {
    this._content.forEach((value, variable) => callback(variable, value))
  }
}
