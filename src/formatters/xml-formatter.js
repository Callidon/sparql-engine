/*! @license MIT ©2014-2016 Miel Vander Sande, Ghent University - imec */
/* Writer that serializes a SPARQL query result application/sparql+xml */

const SparqlResultWriter = require('./SparqlResultWriter')
const _ = require('lodash')
const util = require('ldf-client/lib/util/RdfUtil')
const xml = require('xml')

class SparqlXMLResultWriter extends SparqlResultWriter {
  _writeHead (variableNames) {
    // Write root element
    let self = this
    let root = this._root = xml.element({
      _attr: { xlmns: 'http://www.w3.org/2005/sparql-results#' }
    })
    xml({ sparql: root }, { stream: true, indent: '  ', declaration: true })
      .on('data', function (chunk) { self._push(chunk + '\n') })

    // Write head element
    if (variableNames.length) {
      root.push({
        head: variableNames.map(function (v) {
          return { variable: { _attr: { name: v } } }
        })
      })
    }
  }

  _writeBindings (result) {
    // With the first result, write the results element
    if (!this._results) { this._root.push({ results: this._results = xml.element({}) }) }

    // Unbound variables cannot be part of XML
    result = _.omit(result, function (value) {
      return value === undefined || value === null
    })

    // Write the result element
    this._results.push({
      result: _.map(result, function (value, variable) {
        var xmlValue, lang, type
        if (!util.isLiteral(value)) { xmlValue = util.isBlank(value) ? { bnode: value } : { uri: value } } else {
          xmlValue = { literal: util.getLiteralValue(value) }
          if (lang = util.getLiteralLanguage(value)) {
            xmlValue.literal = [{ _attr: { 'xml:lang': lang } }, xmlValue.literal]
          } else if (type = util.getLiteralType(value)) {
            xmlValue.literal = [{ _attr: { datatype: type } }, xmlValue.literal]
          }
        }
        return { binding: [{ _attr: { name: variable.substring(1) } }, xmlValue] }
      })
    })
  }

  _writeBoolean (result) {
    this._root.push({ boolean: result })
  }

  _flush (done) {
    // If there were no matches, the results element hasn't been created yet
    if (this._empty) { this._root.push({ results: this._results = xml.element({}) }) }
    // There's no results element for ASK queries
    if (this._results) { this._results.close() }
    this._root.close()
    done()
  }
}

module.exports = SparqlXMLResultWriter
