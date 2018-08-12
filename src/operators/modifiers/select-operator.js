const { TransformIterator } = require('asynciterator')
const rdf = require('ldf-client/lib/util/RdfUtil')

function SparqlSelectIterator (source, query, options) {
  TransformIterator.call(this, source, options)
  this.setProperty('variables', query.variables)
  this._options = options
}
TransformIterator.subclass(SparqlSelectIterator)

// Executes the SELECT projection
SparqlSelectIterator.prototype._transform = function (bindings, done) {
  var that = this
  this._push(this.getProperty('variables').reduce(function (row, variable) {
    // Project a simple variable by copying its value
    if (variable !== '*') {
      if (variable.expression != null) {
        if (typeof variable.expression === 'string') {
          row[variable.variable] = valueOf(variable.expression)
        } else {
          row[variable.variable] = valueOf(variable.variable)
        }
      } else {
        row[variable] = valueOf(variable)
      }
    } else {
      // Project a star selector by copying all variable bindings
      for (variable in bindings) {
        if (that._options.artificials != null) {
          if (rdf.isVariable(variable) && !that._options.artificials.includes(variable)) { row[variable] = valueOf(variable) }
        } else {
          if (rdf.isVariable(variable)) { row[variable] = valueOf(variable) }
        }
      }
    }
    return row
  }, Object.create(null)))
  done()
  function valueOf (variable) {
    var value = bindings[variable]
    return typeof value === 'string' ? rdf.deskolemize(value) : null
  }
}

module.exports = SparqlSelectIterator
