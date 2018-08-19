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
const AsyncIterator = require('asynciterator')
const GroupByOperator = require('../operators/gb-operator.js')
// const OperationOperator = require('../operators/op-operator.js')
const AggrOperator = require('../operators/agg-operator.js')
const UnionOperator = require('../operators/union-operator.js')
const SortIterator = require('ldf-client/lib/sparql/SortIterator')
const DistinctIterator = require('../operators/distinct-operator.js')
const FilterOperator = require('../operators/filter-operator.js')
const SPARQLExpression = require('../operators/expressions/sparql-expression.js')
const SparqlExpressionEvaluator = require('../utils/SparqlExpressionEvaluator.js')
// solution modifiers
const SelectOperator = require('../operators/modifiers/select-operator.js')
const AskOperator = require('../operators/modifiers/ask-operator.js')
const ConstructOperator = require('../operators/modifiers/construct-operator.js')
// executors
const AggregateExecutor = require('./executors/aggregate-executor.js')
const BGPExecutor = require('./executors/bgp-executor.js')
const GraphExecutor = require('./executors/graph-executor.js')
// utils
const _ = require('lodash')
const { deepApplyBindings, extendByBindings, rdf } = require('../utils.js')
const { transformPath } = require('./property-paths.js')

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
    this._executor = new BGPExecutor(this._dataset)
    this._aggExecutor = new AggregateExecutor()
    this._graphExecutor = new GraphExecutor(this._dataset, this)
    this._serviceExecutor = null
  }

  /**
   * Set the BGP executor used to evaluate Basic Graph patterns
   * @param {BGPExecutor} executor - BGP executor used to evaluate Basic Graph patterns
   */
  setExecutor (executor) {
    this._executor = executor
  }

  /**
   * Set the executor used to evaluate SERVICE clauses
   * @param {GraphExecutor} executor - Executor used to evaluate SERVICE clauses
   */
  setServiceExecutor (executor) {
    this._serviceExecutor = executor
  }

  /**
   * Build the physical query execution of a SPARQL query
   * and returns an iterator that can be consumed to evaluate the query.
   * @param  {string|Object} query         - SPARQL query to evaluate (in string or JSON format)
   * @param  {Object}        [options={}]  - Execution options
   * @param  {AsyncIterator} [source=null] - Source iterator
   * @return {AsyncIterator} An iterator that can be consumed to evaluate the query.
   */
  build (query, options = {}, source = null) {
    if (_.isNull(source)) {
      // build pipeline starting iterator
      source = AsyncIterator.single({})
    }

    // If needed, parse the string query into a logical query execution plan
    if (typeof query === 'string') {
      query = new Parser(options.prefixes).parse(query)
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
        queryType: 'CONSTRUCT',
        template,
        type: 'query',
        where: query.where.concat(where)
      }
      return this.build(construct, options, source)
    }

    // DEPRECATED: old behaviour to handle VALUES
    // if (query.values != null) {
    //   query.where.push({type: 'values', values: query.values})
    // }

    // Create an iterator that projects the bindings according to the query type
    if (query.base != null) {
      options.base = query.base
    }

    // Handles WHERE clause
    let graphIterator
    if (query.patterns != null || (query.where != null && query.where.length > 0)) {
      graphIterator = this._buildWhere(source, query.patterns || query.where, options)
    } else {
      graphIterator = AsyncIterator.single({})
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
    graphIterator = this._buildOrderBy(graphIterator, query.order, options)

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
    groups.sort(function (a, b) {
      if (a.type === b.type) {
        return 0
      } else if (a.type === 'filter' || b.type === 'values') {
        return 1
      } else if (b.type === 'filter' || a.type === 'values') {
        return -1
      } else {
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
    // DEPRECATED: old behaviour to handle VALUES
    // if (groups[0].type === 'values') {
    //   var vals = groups[0].values
    //   var bgpIndex = _.findIndex(groups, {'type': 'bgp'})
    //   var union = {type: 'union', patterns: []}
    //   for (let i = 0; i < vals.length; i++) {
    //     for (var val in vals[i]) {
    //       if (vals[i][val] == null) {
    //         delete vals[i][val]
    //       }
    //     }
    //     var newBGP = replaceValues(groups[bgpIndex], vals[i])
    //     var unit = _.cloneDeep(groups.slice(1, -1))
    //     unit[bgpIndex - 1] = newBGP
    //     union.patterns.push({type: 'group', patterns: unit, value: vals[i]})
    //   }
    //   return new UnionOperator(...union.patterns.map(patternToken => {
    //     var unionIter = this._buildGroup(source.clone(), patternToken, options)
    //     return new ValuesOperator(unionIter, patternToken.value, options)
    //   }))
    // } else {
    return groups.reduce((source, group) => {
      return this._buildGroup(source, group, options)
    }, source)
    // }
  }

  /**
   * Build a physical plan for a SPARQL group clause
   * @param  {[type]} source  [description]
   * @param  {[type]} group   [description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  _buildGroup (source, group, options) {
    // Reset flags on the options for child iterators
    var childOptions = options.optional ? _.create(options, { optional: false }) : options

    switch (group.type) {
      case 'bgp':
        if (_.isNull(this._executor)) {
          throw new Error('A PlanBuilder cannot evaluate a Basic Graph Pattern without a BGPExecutor')
        }
        var copyGroup = Object.assign({}, group)
        // evaluate possible Property paths
        var ret = transformPath(copyGroup.triples, copyGroup, options)
        var bgp = ret[0]
        var union = ret[1]
        var filter = ret[2]
        if (union != null) {
          return this._buildGroup(source, union, childOptions)
        } else if (filter.length > 0) {
          var groups = [{type: 'bgp', triples: bgp}]
          for (let i = 0; i < filter.length; i++) {
            groups.push(filter[i])
          }
          return this._buildWhere(source, groups, childOptions)
        } else {
          // delegate BGP evaluation to an executor
          return this._executor.buildIterator(source, bgp, options)
        }
      case 'query':
        return this.build(group, options, source)
      case 'graph':
        if (_.isNull(this._graphExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a GRAPH clause without a GraphExecutor')
        }
        return this._graphExecutor.buildIterator(source, group, options)
      case 'service':
        if (_.isNull(this._serviceExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a SERVICE clause without a ServiceExecutor')
        }
        // delegate SERVICE evaluation to an executor
        return this._serviceExecutor.buildIterator(source, group, options)
      case 'group':
        return this._buildWhere(source, group.patterns, childOptions)
      case 'optional':
        childOptions = _.create(options, { optional: true })
        return this._buildWhere(source, group.patterns, childOptions)
      case 'union':
        return new UnionOperator(...group.patterns.map(patternToken => {
          return this._buildGroup(source.clone(), patternToken, childOptions)
        }))
      case 'filter':
      // A set of bindings does not match the filter
      // if it evaluates to 0/false, or errors
        return new FilterOperator(source, group.expression)
        // var evaluate = new SparqlExpressionEvaluator(group.expression)
        // return source.filter(bindings => {
        //   try { return !/^"false"|^"0"/.test(evaluate(bindings)) } catch (error) { return false }
        // })
      case 'bind':
        const variable = group.variable
        const expression = new SPARQLExpression(group.expression)
        return source.map(bindings => {
          try {
            bindings[variable] = expression.evaluate(bindings).asRDF
          } catch (e) {}
          return bindings
        })
      default:
        throw new Error(`Unsupported SPARQL group pattern found in query: ${group.type}`)
    }
  }

  /**
   * Build a physical plan for a SPARQL HAVING clause
   * @param  {[type]} source  [description]
   * @param  {[type]} query   [description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  _buildHaving (source, query, options) {
    let iterator = source
    for (let i = 0; i < query.having.length; i++) {
      var hav = query.having[i]
      for (var j = 0; j < hav.args.length; j++) {
        if (typeof hav.args[j] !== 'string') {
          var newVar = '?tmp_' + Math.random().toString(36).substring(8)
          if (options.artificials == null) {
            options.artificials = []
          }
          options.artificials.push(newVar)
          var aggrVar = {variable: newVar, expression: hav.args[j]}
          if (query.group) {
            iterator = new AggrOperator(iterator, aggrVar)
          } else {
            query.group = 'placeholder'
            iterator = new GroupByOperator(iterator, '*', options)
            iterator = new AggrOperator(iterator, aggrVar)
          }
          hav.args[j] = newVar
        }
      }
      const filter = {type: 'filter', expression: hav}
      iterator = this._buildGroup(iterator, filter, options)
    }
    return iterator
  }

  /**
   * Build a physical plan for a SPARQL ORDER BY clause
   * @param  {[type]} source  [description]
   * @param  {[type]} orderby [description]
   * @param  {[type]} options [description]
   * @return {AsyncIterator}         [description]
   */
  _buildOrderBy (source, orderby, options) {
    let iterator = source
    for (let i = orderby && (orderby.length - 1); i >= 0; i--) {
      let order = new SparqlExpressionEvaluator(orderby[i].expression)
      let ascending = !orderby[i].descending
      iterator = new SortIterator(iterator, (a, b) => {
        let orderA = ''
        let orderB = ''
        try { orderA = order(a) } catch (error) { /* ignore order error */ }
        try { orderB = order(b) } catch (error) { /* ignore order error */ }
        if (!isNaN(orderA)) {
          orderA = Number(orderA)
        }
        if (!isNaN(orderB)) {
          orderB = Number(orderB)
        }
        if (orderA < orderB) return ascending ? -1 : 1
        if (orderA > orderB) return ascending ? 1 : -1
        return 0
      }, options)
    }
    return iterator
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
