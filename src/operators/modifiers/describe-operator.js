const ConstructOperator = require('./construct-operator.js')
const rdf = require('ldf-client/lib/util/RdfUtil')
// Creates an iterator for a parsed SPARQL DESCRIBE query
function SparqlDescribeIterator (source, query, options) {
  // Create a template with `?var ?p ?o` patterns for each variable
  let variables = query.variables
  let template = query.template = []
  for (let i = 0, l = variables.length; i < l; i++) { template.push(rdf.triple(variables[i], '?__predicate' + i, '?__object' + i)) }
  query.where = query.where.concat({ type: 'bgp', triples: template })
  ConstructOperator.call(this, source, query, options)
}
ConstructOperator.subclass(SparqlDescribeIterator)

module.exports = SparqlDescribeIterator
