/* file : groupby-operator.ts
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

import MaterializeOperator from '../materialize-operator'
import { rdf } from '../../utils'
import { AsyncIterator } from 'asynciterator'
import { Bindings } from '../../rdf/bindings'

/**
 * Build a new aggregate group from a set of SPARQL variables
 * @param variables - Set of SPARQL variables
 * @return A new aggregate group
 */
function buildNewGroup (variables: string[]): Object {
  return variables.reduce((rows, v) => {
    rows[v] = []
    return rows
  }, {})
}

/**
 * Apply a SPARQL GROUP BY clause
 * @see https://www.w3.org/TR/sparql11-query/#groupby
 * @extends MaterializeOperator
 * @author Thomas Minier
 */
export default class GroupByOperator extends MaterializeOperator {
  private readonly _variables: string[]
  private readonly _groups: Map<string, any>
  private readonly _keys: Map<string, Bindings>

  /**
   * Constructor
   * @param source - Source iterator
   * @param variables - GROUP BY Variables
   * @param options - Execution options
   */
  constructor (source: AsyncIterator<Bindings>, variables: string[], options: Object) {
    super(source, options)
    this._variables = variables
    // store each group by key
    this._groups = new Map()
    // also store the keys in 'bindings' format
    // to avoid a reverse hashing when we needs the original bindings back
    this._keys = new Map()
  }

  _hashBindings (bindings: Bindings): string {
    return this._variables.map(v => {
      if (bindings.has(v)) {
        return bindings.get(v)
      }
      return 'null'
    }).join(';')
  }

  _preTransform (bindings: Bindings): Bindings | null {
    const key = this._hashBindings(bindings)
    // create a new group is needed
    if (!this._groups.has(key)) {
      this._keys.set(key, bindings.filter(variable => this._variables.indexOf(variable) > -1))
      this._groups.set(key, buildNewGroup(Array.from(bindings.variables())))
    }
    // parse each binding in the intermediate format used by SPARQL expressions
    // and insert it into the corresponding group
    bindings.forEach((variable, value) => {
      this._groups.get(key)[variable].push(rdf.parseTerm(value))
    })
    return null
  }

  _transformAll (values: Bindings[]): Bindings[] {
    const aggregates: any[] = []
    // transform each group in a set of bindings
    this._groups.forEach((group, key) => {
      // also add the GROUP BY keys to the set of bindings
      const b = this._keys.get(key)!.clone()
      b.setProperty('__aggregate', group)
      aggregates.push(b)
    })
    return aggregates
  }
}
