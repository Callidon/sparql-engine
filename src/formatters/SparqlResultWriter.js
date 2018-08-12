/*! @license MIT ©2014-2016 Miel Vander Sande, Ghent University - imec */
/* Serializing the output of a SparqlIterator */

const { TransformIterator } = require('asynciterator')

class SparqlResultWriter extends TransformIterator {
  constructor (source) {
    super(source)
    this._empty = true
    this._variables = source.getProperty('variables') || []
    this._variables = this._variables.map(function (v) {
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

  _begin (done) {
    this._writeHead(this._variables.map(function (v) {
      return v.substring(1)
    }))
    done()
  }

  _writeHead (variableNames) {}

  _transform (result, done) {
    if (typeof result === 'boolean') {
      this._writeBoolean(result)
    } else {
      this._writeBindings(result)
    }
    this._empty = false
    done()
  }

  _writeBindings (result) {
    throw new Error('The _writeBindings method has not been implemented.')
  }

  _writeBoolean (result) {
    throw new Error('The _writeBoolean method has not been implemented.')
  }
}

// Register a writer for a given media type
SparqlResultWriter.register = function (mediaType, ResultWriter) {
  SparqlResultWriter.writers[mediaType] = ResultWriter
}

// Instantiate a writer of a given media type
SparqlResultWriter.instantiate = function (mediaType, source) {
  // Look up the class or class name
  var ResultWriter = SparqlResultWriter.writers[mediaType]
  if (!ResultWriter) { throw new Error('No writer available for media type ' + mediaType + '.') }
  // If it is a class name, load the class
  if (typeof ResultWriter === 'string') { ResultWriter = SparqlResultWriter.writers[mediaType] = require(ResultWriter) }
  // Create an instance of the subclass
  return new ResultWriter(source)
}

module.exports = SparqlResultWriter
