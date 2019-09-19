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
import { rdf } from '../utils'

/**
 * A set of mappings from a variable to a RDF Term.
 * @abstract
 * @author Thomas Minier
 */
export abstract class Bindings {
  private readonly _properties: Map<string, any>

  constructor () {
    this._properties = new Map()
  }

  /**
   * The number of mappings in the set
   * @return The number of mappings in the set
   */
  abstract get size (): number

  /**
   * Returns True if the set is empty, False otherwise
   * @return True if the set is empty, False otherwise
   */
  abstract get isEmpty (): boolean

  /**
   * Get an iterator over the SPARQL variables in the set
   * @return An iterator over the SPARQL variables in the set
   */
  abstract variables (): IterableIterator<string>

  /**
   * Get an iterator over the RDF terms in the set
   * @return An iterator over the RDF terms in the set
   */
  abstract values (): IterableIterator<string>

  /**
   * Get the RDF Term associated with a SPARQL variable
   * @param variable - SPARQL variable
   * @return The RDF Term associated with the given SPARQL variable
   */
  abstract get (variable: string): string | null

  /**
   * Test if mappings exists for a SPARQL variable
   * @param variable - SPARQL variable
   * @return True if a mappings exists for this variable, False otherwise
   */
  abstract has (variable: string): boolean

  /**
   * Add a mapping SPARQL variable -> RDF Term to the set
   * @param variable - SPARQL variable
   * @param value - RDF Term
   */
  abstract set (variable: string, value: string): void

  /**
   * Get metadata attached to the set using a key
   * @param  key - Metadata key
   * @return The metadata associated with the given key
   */
  getProperty (key: string): any {
    return this._properties.get(key)
  }

  /**
   * Check if a metadata with a given key is attached to the set
   * @param  key - Metadata key
   * @return Tur if the metadata exists, False otherwise
   */
  hasProperty (key: string): boolean {
    return this._properties.has(key)
  }

  /**
   * Attach metadata to the set
   * @param key - Key associated to the value
   * @param value - Value to attach
   */
  setProperty (key: string, value: any): void {
    this._properties.set(key, value)
  }

  /**
   * Invoke a callback on each mapping
   * @param callback - Callback to invoke
   * @return
   */
  abstract forEach (callback: (variable: string, value: string) => void): void

  /**
   * Remove all mappings from the set
   * @return
   */
  abstract clear (): void

  /**
   * Returns an empty set of mappings
   * @return An empty set of mappings
   */
  abstract empty (): Bindings

  /**
   * Serialize the set of mappings as a plain JS Object
   * @return The set of mappings as a plain JS Object
   */
  toObject (): Object {
    return this.reduce((acc, variable, value) => {
      acc[variable] = value
      return acc
    }, {})
  }

  /**
   * Serialize the set of mappings as a string
   * @return The set of mappings as a string
   */
  toString (): string {
    const value = this.reduce((acc, variable, value) => {
      if (! value.startsWith('"')) {
        value = `<${value}>`
      }
      return `${acc} ${variable} -> ${value},`
    }, '{')
    return value.substring(0, value.length - 1) + ' }'
  }

  /**
   * Creates a deep copy of the set of mappings
   * @return A deep copy of the set
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
   * @param other - A set of mappings
   * @return True if the two sets are equal, False otherwise
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
   * @param triple  - Triple pattern
   * @return An new, bounded triple pattern
   */
  bound (triple: Algebra.TripleObject): Algebra.TripleObject {
    const newTriple = Object.assign({}, triple)
    if (rdf.isVariable(triple.subject) && this.has(triple.subject)) {
      newTriple.subject = this.get(triple.subject)!
    }
    if (rdf.isVariable(triple.predicate) && this.has(triple.predicate)) {
      newTriple.predicate = this.get(triple.predicate)!
    }
    if (rdf.isVariable(triple.object) && this.has(triple.object)) {
      newTriple.object = this.get(triple.object)!
    }
    return newTriple
  }

  /**
   * Creates a new bindings with additionnal mappings
   * @param values - Pairs [variable, value] to add to the set
   * @return A new Bindings with the additionnal mappings
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
   * @param other - Set of mappings
   * @return The Union set of mappings
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
   * @param other - Set of mappings
   * @return The intersection set of mappings
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
   * Performs a set difference with another set of mappings, i.e., A.difference(B) returns all mappings that are in A and not in B.
   * @param  other - Set of mappings
   * @return The results of the set difference
   */
  difference (other: Bindings): Bindings {
    return this.filter((variable: string, value: string) => {
      return (!other.has(variable)) || (value !== other.get(variable))
    })
  }

  /**
   * Test if the set of bindings is a subset of another set of mappings.
   * @param  other - Superset of mappings
   * @return Ture if the set of bindings is a subset of another set of mappings, False otherwise
   */
  isSubset (other: Bindings): boolean {
    return Array.from(this.variables()).every((v: string) => {
      return other.has(v) && other.get(v) === this.get(v)
    })
  }

  /**
   * Creates a new set of mappings using a function to transform the current set
   * @param mapper - Transformation function (variable, value) => [string, string]
   * @return A new set of mappings
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
   * @param mapper - Transformation function
   * @return A new set of mappings
   */
  mapVariables (mapper: (variable: string, value: string) => string | null): Bindings {
    return this.map((variable, value) => [mapper(variable, value), value])
  }

  /**
   * Same as map, but only transform values
   * @param mapper - Transformation function
   * @return A new set of mappings
   */
  mapValues (mapper: (variable: string, value: string) => string | null): Bindings {
    return this.map((variable, value) => [variable, mapper(variable, value)])
  }

  /**
   * Filter mappings from the set of mappings using a predicate function
   * @param predicate - Predicate function
   * @return A new set of mappings
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
   * @param reducer - Reducing function
   * @param start - Value used to start the accumulation
   * @return The accumulated value
   */
  reduce<T> (reducer: (acc: T, variable: string, value: string) => T, start: T): T {
    let acc: T = start
    this.forEach((variable, value) => {
      acc = reducer(acc, variable, value)
    })
    return acc
  }

  /**
   * Test if some mappings in the set pass a predicate function
   * @param  predicate - Function to test for each mapping
   * @return True if some mappings in the set some the predicate function, False otheriwse
   */
  some (predicate: (variable: string, value: string) => boolean): boolean {
    let res = false
    this.forEach((variable, value) => {
      res = res || predicate(variable, value)
    })
    return res
  }

  /**
   * Test if every mappings in the set pass a predicate function
   * @param  predicate - Function to test for each mapping
   * @return True if every mappings in the set some the predicate function, False otheriwse
   */
  every (predicate: (variable: string, value: string) => boolean): boolean {
    let res = true
    this.forEach((variable, value) => {
      res = res && predicate(variable, value)
    })
    return res
  }
}

/**
 * A set of mappings from a variable to a RDF Term, implements using a HashMap
 * @author Thomas Minier
 */
export class BindingBase extends Bindings {
  private readonly _content: Map<string, string>

  constructor () {
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
   * @param obj - Source object to turn into a set of mappings
   * @return A set of mappings
   */
  static fromObject (obj: Object): Bindings {
    const res = new BindingBase()
    for (let key in obj) {
      res.set(!key.startsWith('?') ? `?${key}` : key, obj[key])
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
