/* file : xml-formatter.js
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

const ResultsFormatter = require('./results-formatter')
const xml = require('xml')
const { map, omit, isNull, isUndefined } = require('lodash')

/**
 * Formats results in XML format
 * @see https://www.w3.org/TR/2013/REC-rdf-sparql-XMLres-20130321/
 * @extends ResultsFormatter
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
class XMLFormatter extends ResultsFormatter {
  constructor (source, variables, options) {
    super(source, variables, options)
    this._root = xml.element({
      _attr: { xlmns: 'http://www.w3.org/2005/sparql-results#' }
    })
    this._results = xml.element({})
    this._stream = xml({ sparql: this._root }, { stream: true, indent: '\t', declaration: true })
    this._stream.on('data', v => this._push(v))
  }

  _writeHead (variableNames, done) {
    // Write head element
    if (variableNames.length > 0 && variableNames[0] !== '*') {
      this._root.push({
        head: variableNames.map(name => {
          return { variable: { _attr: { name } } }
        })
      })
    }
    // Write the results tag
    this._root.push({
      results: this._results
    })
    done()
  }

  _writeBindings (bindings, done) {
    // remove null & undefined values
    bindings = omit(bindings, value => isNull(value) || isUndefined(value))

    // Write the result tag for this set of bindings
    this._results.push({
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
    done()
  }

  _writeBoolean (result, done) {
    this._root.push({ boolean: result })
    done()
  }

  _flush (done) {
    this._results.close()
    this._root.close()
    done()
  }
}

module.exports = XMLFormatter
