/* file : results-formatter.js
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

import { AsyncIterator, TransformIterator } from 'asynciterator'
import { rdf } from '../utils'
import { mapValues, isBoolean } from 'lodash'

/**
 * Abstract class to serialize solution bindings into valid SPARQL results
 * @abstract
 * @extends TransformIterator
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default abstract class ResultsFormatter extends TransformIterator {
  readonly _variables: string[]
  private _empty: boolean

  constructor (source: AsyncIterator, variables: any, options: Object = {}) {
    super(source, options)
    this._empty = true
    this._variables = variables.map((v: any) => {
      if (typeof v === 'object') {
        while (v.variable === null) {
          v = v.expression
        }
        return v.variable
      } else {
        return v
      }
    })
  }

  get empty (): boolean {
    return this._empty
  }

  _begin (done: () => void): void {
    this._writeHead(this._variables.map(v => v.substring(1)), done)
  }

  _writeHead (variables: string[], done: () => void): void {
    done()
  }

  _transform (bindings: Object, done: () => void): void {
    if (isBoolean(bindings)) {
      this._writeBoolean(bindings, done)
    } else {
      // convert bindings values in intermediate format before processing
      this._writeBindings(mapValues(bindings, (v: any) => {
        if (v !== null) {
          return rdf.parseTerm(v)
        }
        return v
      }), done)
    }
    this._empty = false
  }

  abstract _writeBindings (result: Object, done: () => void): void

  abstract _writeBoolean (result: Object, done: () => void): void
}
