const { TransformIterator } = require('asynciterator')
const rdf = require('ldf-client/lib/util/RdfUtil')
// Creates an iterator for a parsed SPARQL CONSTRUCT query
function SparqlConstructIterator (source, query, options) {
  TransformIterator.call(this, source, options)

  // Push constant triple patterns only once
  this._template = query.template.filter(function (triplePattern) {
    return rdf.hasVariables(triplePattern) || this._push(triplePattern)
  }, this)
  this._blankNodeId = 0
}
TransformIterator.subclass(SparqlConstructIterator)

// Executes the CONSTRUCT projection
SparqlConstructIterator.prototype._transform = function (bindings, done) {
  var blanks = Object.create(null)
  this._template.forEach(function (triplePattern) {
    // Apply the result bindings to the triple pattern, ensuring no variables are left
    let s = triplePattern.subject
    let p = triplePattern.predicate
    let o = triplePattern.object
    let s0 = s[0]
    let p0 = p[0]
    let o0 = o[0]
    if (s0 === '?') { if ((s = rdf.deskolemize(bindings[s])) === undefined) return } else if (s0 === '_') s = blanks[s] || (blanks[s] = '_:b' + this._blankNodeId++)
    if (p0 === '?') { if ((p = rdf.deskolemize(bindings[p])) === undefined) return } else if (p0 === '_') p = blanks[p] || (blanks[p] = '_:b' + this._blankNodeId++)
    if (o0 === '?') { if ((o = rdf.deskolemize(bindings[o])) === undefined) return } else if (o0 === '_') o = blanks[o] || (blanks[o] = '_:b' + this._blankNodeId++)
    this._push({ subject: s, predicate: p, object: o })
  }, this)
  done()
}

module.exports = SparqlConstructIterator
