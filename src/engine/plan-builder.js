/* file : plan-builder.js
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

const { Parser } = require('sparqljs')
const { single } = require('asynciterator')
const BindOperator = require('../operators/bind-operator.js')
const UnionOperator = require('../operators/union-operator.js')
const DistinctIterator = require('../operators/distinct-operator.js')
const FilterOperator = require('../operators/filter-operator.js')
const OptionalOperator = require('../operators/optional-operator.js')
const OrderByOperator = require('../operators/orderby-operator.js')
const ExistsOperator = require('../operators/exists-operator.js')
const MinusOperator = require('../operators/minus-operator.js')
// solution modifiers
const SelectOperator = require('../operators/modifiers/select-operator.js')
const AskOperator = require('../operators/modifiers/ask-operator.js')
const ConstructOperator = require('../operators/modifiers/construct-operator.js')
// executors
const AggregateExecutor = require('./executors/aggregate-executor.js')
const BGPExecutor = require('./executors/bgp-executor.js')
const GraphExecutor = require('./executors/graph-executor.js')
const UpdateExecutor = require('./executors/update-executor.js')
// formatters
const XMLFormatter = require('../formatters/xml-formatter.js')
// utils
const _ = require('lodash')
const { deepApplyBindings, extendByBindings, rdf } = require('../utils.js')

const queryConstructors = {
  SELECT: SelectOperator,
  CONSTRUCT: ConstructOperator,
  ASK: AskOperator
}

/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
class PlanBuilder {
  constructor (dataset, prefixes = {}) {
    this._dataset = dataset
    this._parser = new Parser(prefixes)
    this._bgpExecutor = new BGPExecutor(this._dataset)
    this._aggExecutor = new AggregateExecutor()
    this._graphExecutor = new GraphExecutor(this._dataset, this)
    this._updateExecutor = new UpdateExecutor(this._dataset, this)
    this._serviceExecutor = null
  }

  /**
   * Set the BGP executor used to evaluate Basic Graph patterns
   * @param {BGPExecutor} executor - Executor used to evaluate Basic Graph patterns
   */
  set bgpExecutor (executor) {
    this._bgpExecutor = executor
  }

  /**
   * Set the BGP executor used to evaluate SPARQL Aggregates
   * @param {AggregateExecutor} executor - Executor used to evaluate SPARQL Aggregates
   */
  set aggregateExecutor (executor) {
    this._aggExecutor = executor
  }

  /**
   * Set the BGP executor used to evaluate SPARQL GRAPH clauses
   * @param {GraphExecutor} executor - Executor used to evaluate SPARQL GRAPH clauses
   */
  set graphExecutor (executor) {
    this._graphExecutor = executor
  }

  /**
   * Set the BGP executor used to evaluate SPARQL UPDATE queries
   * @param {UpdateExecutor} executor - Executor used to evaluate SPARQL UPDATE queries
   */
  set updateExecutor (executor) {
    this._updateExecutor = executor
  }

  /**
   * Set the executor used to evaluate SERVICE clauses
   * @param {GraphExecutor} executor - Executor used to evaluate SERVICE clauses
   */
  set serviceExecutor (executor) {
    this._serviceExecutor = executor
  }

  /**
   * Build the physical query execution of a SPARQL 1.1 query
   * and returns an iterator that can be consumed to evaluate the query.
   * @param  {string}  query        - SPARQL query to evaluated
   * @param  {Object} [options={}]  - Execution options
   * @return {AsyncIterator} An iterator that can be consumed to evaluate the query.
   */
  build (query, options = { format: 'raw' }) {
    // If needed, parse the string query into a logical query execution plan
    if (typeof query === 'string') {
      query = new Parser(options.prefixes).parse(query)
    }
    switch (query.type) {
      case 'query':
        const iterator = this._buildQueryPlan(query, options)
        // only use results formatters for select & ask queries
        if (query.queryType === 'CONSTRUCT' || query.queryType === 'DESCRIBE') {
          return iterator
        }
        switch (options.format) {
          case 'xml':
          case 'application/xml':
          case 'application/sparql-results+xml':
            return new XMLFormatter(iterator, query.variables)
          default:
            return iterator
        }
      case 'update':
        return this._updateExecutor.execute(query.updates, options)
      default:
        throw new SyntaxError(`Unsupported SPARQL query type: ${query.type}`)
    }
  }

  /**
   * Build the physical query execution of a SPARQL query
   * @param  {Object}        query         - Parsed SPARQL query
   * @param  {Object}        [options={}]  - Execution options
   * @param  {AsyncIterator} [source=null] - Source iterator
   * @return {AsyncIterator} An iterator that can be consumed to evaluate the query.
   */
  _buildQueryPlan (query, options = {}, source = null) {
    if (_.isNull(source)) {
      // build pipeline starting iterator
      source = single({})
    }
    options.prefixes = query.prefixes

    // rewrite a DESCRIBE query into a CONSTRUCT query
    if (query.queryType === 'DESCRIBE') {
      const template = []
      const where = [{
        type: 'bgp',
        triples: []
      }]
      query.variables.forEach(v => {
        const triple = rdf.triple(v, `?pred__describe__${v}`, `?obj__describe__${v}`)
        template.push(triple)
        where[0].triples.push(triple)
      })
      const construct = {
        prefixes: query.prefixes,
        from: query.from,
        queryType: 'CONSTRUCT',
        template,
        type: 'query',
        where: query.where.concat(where)
      }
      return this._buildQueryPlan(construct, options, source)
    }

    // Create an iterator that projects the bindings according to the query type
    if (query.base != null) {
      options.base = query.base
    }

    // Handles FROM clauses
    if (query.from) {
      options._from = query.from
    }

    // Handles WHERE clause
    let graphIterator
    if (query.patterns != null || (query.where != null && query.where.length > 0)) {
      graphIterator = this._buildWhere(source, query.patterns || query.where, options)
    } else {
      graphIterator = single({})
    }

    // Parse query variable to separate projection & aggregate variables
    if (query.variables != null) {
      const [projection, aggregates] = _.partition(query.variables, v => _.isString(v))
      // add aggregates variables to projection variables
      query.variables = projection.concat(aggregates.map(agg => agg.variable))
      query.aggregates = aggregates
    }

    // Handles Aggregates
    graphIterator = this._aggExecutor.buildIterator(graphIterator, query, options)

    // Handles ORDER BY
    if ('order' in query) {
      graphIterator = new OrderByOperator(graphIterator, query.order, options)
    }

    if (!(query.queryType in queryConstructors)) {
      throw new Error(`Unsupported SPARQL query type: ${query.queryType}`)
    }
    graphIterator = new queryConstructors[query.queryType](graphIterator, query, options)

    // Create iterators for modifiers
    if (query.distinct) {
      graphIterator = new DistinctIterator(graphIterator, options)
    }
    // Add offsets and limits if requested
    if ('offset' in query || 'limit' in query) {
      graphIterator = graphIterator.transform({
        offset: query.offset,
        limit: query.limit
      })
    }
    graphIterator.queryType = query.queryType
    return graphIterator
  }

  /**
   * Optimize a WHERE clause and build the corresponding physical plan
   * @param  {AsyncIterator} source  - Source iterator
   * @param  {Object[]}     groups   - WHERE clause to process
   * @param  {Object}       options  - Execution options
   * @return {AsyncIterator} An iterator used to evaluate the WHERE clause
   */
  _buildWhere (source, groups, options) {
    groups = _.sortBy(groups, g => {
      switch (g.type) {
        case 'bgp':
          return 0
        case 'values':
          return 2
        case 'filter':
          return 3
        default:
          return 0
      }
    })

    // Handle VALUES clauses using query rewriting
    if (_.some(groups, g => g.type === 'values')) {
      return this._buildValues(source, groups, options)
    }

    // merge BGPs on the same level
    var newGroups = []
    var prec = null
    for (let i = 0; i < groups.length; i++) {
      var group = groups[i]
      if (group.type === 'bgp' && prec != null && prec.type === 'bgp') {
        let lastGroup = newGroups[newGroups.length - 1]
        lastGroup.triples = _.concat(lastGroup.triples, group.triples)
      } else {
        newGroups.push(group)
      }
      prec = groups[i]
    }
    groups = newGroups

    return groups.reduce((source, group) => {
      return this._buildGroup(source, group, options)
    }, source)
  }

  /**
   * Build a physical plan for a SPARQL group clause
   * @param  {AsyncIterator} source  - Source iterator
   * @param  {Object}        group   - SPARQL Group
   * @param  {Object}        options - Execution options
   * @return {AsyncIterator} AN iterator used to evaluate the SPARQL Group
   */
  _buildGroup (source, group, options) {
    // Reset flags on the options for child iterators
    let childOptions = _.assign({}, options)

    switch (group.type) {
      case 'bgp':
        if (_.isNull(this._bgpExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a Basic Graph Pattern without a BGPExecutor')
        }
        // var copyGroup = Object.assign({}, group)
        // // evaluate possible Property paths
        // var ret = transformPath(copyGroup.triples, copyGroup, options)
        // var bgp = ret[0]
        // var union = ret[1]
        // var filter = ret[2]
        // if (union != null) {
        //   return this._buildGroup(source, union, childOptions)
        // } else if (filter.length > 0) {
        //   var groups = [{type: 'bgp', triples: bgp}]
        //   for (let i = 0; i < filter.length; i++) {
        //     groups.push(filter[i])
        //   }
        //   return this._buildWhere(source, groups, childOptions)
        // } else {
        // delegate BGP evaluation to an executor
        return this._bgpExecutor.buildIterator(source, group.triples, childOptions)
        // }
      case 'query':
        return this._buildQueryPlan(group, options, source)
      case 'graph':
        if (_.isNull(this._graphExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a GRAPH clause without a GraphExecutor')
        }
        // delegate GRAPH evaluation to an executor
        return this._graphExecutor.buildIterator(source, group, childOptions)
      case 'service':
        if (_.isNull(this._serviceExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a SERVICE clause without a ServiceExecutor')
        }
        // delegate SERVICE evaluation to an executor
        return this._serviceExecutor.buildIterator(source, group, childOptions)
      case 'group':
        return this._buildWhere(source, group.patterns, childOptions)
      case 'optional':
        // childOptions = _.assign({ optional: true }, options)
        return new OptionalOperator(source, group.patterns, this, options)
      case 'union':
        return new UnionOperator(...group.patterns.map(patternToken => {
          return this._buildGroup(source.clone(), patternToken, childOptions)
        }))
      case 'minus':
        const rightSource = this._buildWhere(single({}), group.patterns, options)
        return new MinusOperator(source, rightSource, options)
      case 'filter':
        // FILTERs (NOT) EXISTS are handled using dedicated operators
        switch (group.expression.operator) {
          case 'exists':
            return new ExistsOperator(source, group.expression.args, this, false, options)
          case 'notexists':
            return new ExistsOperator(source, group.expression.args, this, true, options)
          default:
            return new FilterOperator(source, group.expression, childOptions)
        }
      case 'bind':
        return new BindOperator(source, group.variable, group.expression, childOptions)
      default:
        throw new Error(`Unsupported SPARQL group pattern found in query: ${group.type}`)
    }
  }

  /**
   * Build an iterator which evaluates a SPARQL query with VALUES clause(s).
   * It rely on a query rewritiing approach:
   * ?s ?p ?o . VALUES ?s { :1 :2 } becomes {:1 ?p ?o} UNION {:2 ?p ?o}
   * @param  {AsyncIterator} source  - Source iterator
   * @param  {Object[]} groups  - Query body, i.e., WHERE clause
   * @param  {Object} options - Execution options
   * @return {AsyncIterator} An iterator which evaluates a SPARQL query with VALUES clause(s)
   */
  _buildValues (source, groups, options) {
    let [ values, others ] = _.partition(groups, g => g.type === 'values')
    const bindingsLists = values.map(g => g.values)
    // for each VALUES clause
    const iterators = bindingsLists.map(bList => {
      // for each value to bind in the VALUES clause
      const unionBranches = bList.map(bindings => {
        // BIND each group with the set of bindings and then evaluates it
        const temp = others.map(g => deepApplyBindings(g, bindings))
        return extendByBindings(this._buildWhere(source.clone(), temp, options), bindings)
      })
      return new UnionOperator(...unionBranches)
    })
    // Users may use more than one VALUES clause
    if (iterators.length > 1) {
      return new UnionOperator(...iterators)
    }
    return iterators[0]
  }
}

module.exports = PlanBuilder
