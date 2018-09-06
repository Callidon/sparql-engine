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

const { TransformIterator } = require('asynciterator')
const { parseTerm } = require('../utils.js').rdf
const { mapValues, isBoolean } = require('lodash')

/**
 * Abstract class to serialize solution bindings into valid SPARQL results
 * @abstract
 * @extends TransformIterator
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
class ResultsFormatter extends TransformIterator {
  constructor (source, variables, options = {}) {
    super(source, options)
    this._empty = true
    this._variables = variables.map(function (v) {
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

  get empty () {
    return this._empty
  }

  _begin (done) {
    this._writeHead(this._variables.map(v => v.substring(1)), done)
  }

  _writeHead (variables, done) {
    done()
  }

  _transform (bindings, done) {
    if (isBoolean(bindings)) {
      this._writeBoolean(bindings, done)
    } else {
      // convert bindings values in intermediate format before processing
      this._writeBindings(mapValues(bindings, v => {
        if (v !== null) {
          return parseTerm(v)
        }
        return v
      }), done)
    }
    this._empty = false
  }

  _writeBindings (result, done) {
    throw new Error('A valid ResultsFormatter must implements a "_writeBindings" method')
  }

  _writeBoolean (result, done) {
    throw new Error('A valid ResultsFormatter must implements a "_writeBoolean" method')
  }
}

module.exports = ResultsFormatter
