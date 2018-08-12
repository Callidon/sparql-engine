/*! @license MIT ©2014-2016 Miel Vander Sande, Ghent University - imec */
/* Writer that serializes a SPARQL query result as a plain JSON array */

const SparqlResultWriter = require('./SparqlResultWriter')

class JSONResultWriter extends SparqlResultWriter {
  _writeHead () {
    this._push('[')
  }

  _writeBindings (bindings) {
    this._push(this._empty ? '\n' : ',\n')
    this._push(JSON.stringify(bindings).trim())
  }

  _writeBoolean (result) {
    this._push('\n' + result)
  }

  _flush (done) {
    this._push(this._empty ? ']\n' : '\n]\n')
    done()
  }
}

module.exports = JSONResultWriter
