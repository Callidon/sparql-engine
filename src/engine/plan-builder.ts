/* file : plan-builder.ts
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

import Dataset from '../rdf/dataset'
import { Bindings, BindingBase } from '../rdf/bindings'
import { Algebra, Parser } from 'sparqljs'
import { AsyncIterator, single } from 'asynciterator'
import { Consumable } from '../operators/update/consumer'
import AggregateOperator from '../operators/aggregates/agg-operator'
import BindOperator from '../operators/bind-operator'
import UnionOperator from '../operators/union-operator'
import DistinctIterator from '../operators/distinct-operator'
import FilterOperator from '../operators/filter-operator'
import OptionalOperator from '../operators/optional-operator'
import OrderByOperator from '../operators/orderby-operator'
import ExistsOperator from '../operators/exists-operator'
import MinusOperator from '../operators/minus-operator'
// solution modifiers
import SelectOperator from '../operators/modifiers/select-operator'
import AskOperator from '../operators/modifiers/ask-operator'
import ConstructOperator from '../operators/modifiers/construct-operator'
// executors
import AggregateExecutor from './executors/aggregate-executor'
import BGPExecutor from './executors/bgp-executor'
import GraphExecutor from './executors/graph-executor'
import UpdateExecutor from './executors/update-executor'
import ServiceExecutor from './executors/service-executor'
// utils
import * as _ from 'lodash'
import { deepApplyBindings, extendByBindings, rdf } from '../utils'

const queryConstructors = {
  SELECT: SelectOperator,
  CONSTRUCT: ConstructOperator,
  ASK: AskOperator
}

export type QueryOutput = Bindings | Algebra.TripleObject | string

/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class PlanBuilder {
  readonly _dataset: Dataset
  readonly _parser: Parser
  private _bgpExecutor: BGPExecutor
  private _aggExecutor: AggregateExecutor
  private _graphExecutor: GraphExecutor
  private _updateExecutor: UpdateExecutor
  private _serviceExecutor: ServiceExecutor | null

  constructor (dataset: Dataset, prefixes: any = {}) {
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
  set bgpExecutor (executor: BGPExecutor) {
    this._bgpExecutor = executor
  }

  /**
   * Set the BGP executor used to evaluate SPARQL Aggregates
   * @param {AggregateExecutor} executor - Executor used to evaluate SPARQL Aggregates
   */
  set aggregateExecutor (executor: AggregateExecutor) {
    this._aggExecutor = executor
  }

  /**
   * Set the BGP executor used to evaluate SPARQL GRAPH clauses
   * @param {GraphExecutor} executor - Executor used to evaluate SPARQL GRAPH clauses
   */
  set graphExecutor (executor: GraphExecutor) {
    this._graphExecutor = executor
  }

  /**
   * Set the BGP executor used to evaluate SPARQL UPDATE queries
   * @param {UpdateExecutor} executor - Executor used to evaluate SPARQL UPDATE queries
   */
  set updateExecutor (executor: UpdateExecutor) {
    this._updateExecutor = executor
  }

  /**
   * Set the executor used to evaluate SERVICE clauses
   * @param {ServiceExecutor} executor - Executor used to evaluate SERVICE clauses
   */
  set serviceExecutor (executor: ServiceExecutor) {
    this._serviceExecutor = executor
  }

  /**
   * Build the physical query execution of a SPARQL 1.1 query
   * and returns an iterator that can be consumed to evaluate the query.
   * @param  {string}  query        - SPARQL query to evaluated
   * @param  {Object} [options={}]  - Execution options
   * @return {AsyncIterator} An iterator that can be consumed to evaluate the query.
   */
  build (query: any, options: any = {}): AsyncIterator<QueryOutput> | Consumable {
    // If needed, parse the string query into a logical query execution plan
    if (typeof query === 'string') {
      query = new Parser(options.prefixes).parse(query)
    }
    switch (query.type) {
      case 'query':
        return this._buildQueryPlan(query, options)
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
  _buildQueryPlan (query: Algebra.RootNode, options: any = {}, source?: AsyncIterator<Bindings>): AsyncIterator<Bindings> {
    if (_.isNull(source) || _.isUndefined(source)) {
      // build pipeline starting iterator
      source = single(new BindingBase())
    }
    options.prefixes = query.prefixes

    let aggregates: any[] = []

    // rewrite a DESCRIBE query into a CONSTRUCT query
    if (query.queryType === 'DESCRIBE') {
      const template: Algebra.TripleObject[] = []
      const where: any = [{
        type: 'bgp',
        triples: []
      }]
      query.variables!.forEach((v: any) => {
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

    // Handles FROM clauses
    if (query.from) {
      options._from = query.from
    }

    // Handles WHERE clause
    let graphIterator
    if (query.where != null && query.where.length > 0) {
      graphIterator = this._buildWhere(source, query.where, options)
    } else {
      graphIterator = single(new BindingBase())
    }

    // Parse query variable to separate projection & aggregate variables
    if ('variables' in query) {
      const parts = _.partition(query.variables, v => _.isString(v))
      aggregates = parts[1]
      // add aggregates variables to projection variables
      query.variables = parts[0].concat(aggregates.map(agg => (<Algebra.Aggregation> agg).variable))
    }

    // Handles Aggregates
    graphIterator = this._aggExecutor.buildIterator(graphIterator, query, options)

    // Handles transformers
    if (aggregates.length > 0) {
      graphIterator = aggregates.reduce((iter, agg) => {
        return new AggregateOperator(iter, agg, options)
      }, graphIterator)
    }

    // Handles ORDER BY
    if ('order' in query) {
      graphIterator = new OrderByOperator(graphIterator, query.order!, options)
    }

    if (!(query.queryType in queryConstructors)) {
      throw new Error(`Unsupported SPARQL query type: ${query.queryType}`)
    }
    graphIterator = new queryConstructors[query.queryType](graphIterator, query, options)

    // Create iterators for modifiers
    if (query.distinct) {
      graphIterator = new DistinctIterator(graphIterator)
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
  _buildWhere (source: AsyncIterator<Bindings>, groups: Algebra.PlanNode[], options: Object): AsyncIterator<Bindings> {
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
        let lastGroup = <Algebra.BGPNode> newGroups[newGroups.length - 1]
        lastGroup.triples = _.concat(lastGroup.triples, (<Algebra.BGPNode> group).triples)
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
  _buildGroup (source: AsyncIterator<Bindings>, group: Algebra.PlanNode, options: Object): AsyncIterator<Bindings> {
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
        return this._bgpExecutor.buildIterator(source, (<Algebra.BGPNode>  group).triples, childOptions)
        // }
      case 'query':
        return this._buildQueryPlan(<Algebra.RootNode> group, options, source)
      case 'graph':
        if (_.isNull(this._graphExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a GRAPH clause without a GraphExecutor')
        }
        // delegate GRAPH evaluation to an executor
        return this._graphExecutor.buildIterator(source, <Algebra.GraphNode> group, childOptions)
      case 'service':
        if (_.isNull(this._serviceExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a SERVICE clause without a ServiceExecutor')
        }
        // delegate SERVICE evaluation to an executor
        return this._serviceExecutor.buildIterator(source, <Algebra.ServiceNode> group, childOptions)
      case 'group':
        return this._buildWhere(source, (<Algebra.GroupNode> group).patterns, childOptions)
      case 'optional':
        // childOptions = _.assign({ optional: true }, options)
        return new OptionalOperator(source, (<Algebra.GroupNode> group).patterns, this, options)
      case 'union':
        return new UnionOperator(...(<Algebra.GroupNode> group).patterns.map(patternToken => {
          return this._buildGroup(source.clone(), patternToken, childOptions)
        }))
      case 'minus':
        const rightSource = this._buildWhere(single(new BindingBase()), (<Algebra.GroupNode> group).patterns, options)
        return new MinusOperator(source, rightSource, options)
      case 'filter':
        const filter = <Algebra.FilterNode> group
        // FILTERs (NOT) EXISTS are handled using dedicated operators
        switch (filter.expression.operator) {
          case 'exists':
            return new ExistsOperator(source, filter.expression.args, this, false, options)
          case 'notexists':
            return new ExistsOperator(source, filter.expression.args, this, true, options)
          default:
            return new FilterOperator(source, filter.expression, childOptions)
        }
      case 'bind':
        const bind = <Algebra.BindNode> group
        return new BindOperator(source, bind.variable, bind.expression, childOptions)
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
  _buildValues (source: AsyncIterator<Bindings>, groups: Algebra.PlanNode[], options: Object): AsyncIterator<Bindings> {
    let [ values, others ] = _.partition(groups, g => g.type === 'values')
    const bindingsLists = values.map(g => (<Algebra.ValuesNode> g).values)
    // for each VALUES clause
    const iterators = bindingsLists.map(bList => {
      // for each value to bind in the VALUES clause
      const unionBranches = bList.map(b => {
        const bindings = BindingBase.fromObject(b)
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
