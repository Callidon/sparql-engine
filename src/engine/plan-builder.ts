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

// General libraries
import { Algebra, Parser } from 'sparqljs'
import { Observable, of, merge } from 'rxjs'
import { map, take, skip } from 'rxjs/operators'
import { Consumable } from '../operators/update/consumer'
// RDF core classes
import { terms } from '../rdf-terms'
import { Bindings, BindingBase } from '../rdf/bindings'
import Dataset from '../rdf/dataset'
// SPARQL query operators
import bind from '../operators/bind'
import sparqlDistinct from '../operators/sparql-distinct'
import exists from '../operators/exists'
import sparqlFilter from '../operators/sparql-filter'
import minus from '../operators/minus'
import optional from '../operators/optional'
import orderby from '../operators/orderby'
// Solution modifiers
import ask from '../operators/modifiers/ask'
import construct from '../operators/modifiers/construct'
import select from '../operators/modifiers/select'
// Executors
import AggregateExecutor from './executors/aggregate-executor'
import BGPExecutor from './executors/bgp-executor'
import PathExecutor from './executors/path-executor'
import GraphExecutor from './executors/graph-executor'
import UpdateExecutor from './executors/update-executor'
import ServiceExecutor from './executors/service-executor'
// Utilities
import {
  partition,
  isNull,
  isString,
  isUndefined,
  some,
  sortBy
} from 'lodash'

import ExecutionContext from './context/execution-context'
import { extractPropertyPaths } from './executors/rewritings'
import { extendByBindings, deepApplyBindings, rdf } from '../utils'

const QUERY_MODIFIERS = {
  SELECT: select,
  CONSTRUCT: construct,
  ASK: ask
}

/**
 * Output of a physical query execution plan
 */
export type QueryOutput = Bindings | Algebra.TripleObject | boolean

/**
 * Type alias to describe the shape of custom functions. It's basically a JSON object from an IRI (in string form) to a function of 0 to many RDFTerms that produces an RDFTerm.
 */
export type CustomFunctions = { [key:string]: (...args: (terms.RDFTerm | terms.RDFTerm[] | null)[]) => terms.RDFTerm }

/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class PlanBuilder {
  private readonly _dataset: Dataset
  private readonly _parser: Parser
  private _bgpExecutor: BGPExecutor
  private _pathExecutor: PathExecutor | null
  private _aggExecutor: AggregateExecutor
  private _graphExecutor: GraphExecutor
  private _updateExecutor: UpdateExecutor
  private _serviceExecutor: ServiceExecutor | null
  private _customFunctions?: CustomFunctions

  /**
   * Constructor
   * @param dataset - RDF Dataset used for query execution
   * @param prefixes - Optional prefixes to use during query processing
   */
  constructor (dataset: Dataset, prefixes: any = {}, customFunctions?: CustomFunctions) {
    this._dataset = dataset
    this._parser = new Parser(prefixes)
    this._bgpExecutor = new BGPExecutor(this._dataset)
    this._aggExecutor = new AggregateExecutor()
    this._graphExecutor = new GraphExecutor(this._dataset)
    this._graphExecutor.builder = this
    this._updateExecutor = new UpdateExecutor(this._dataset)
    this._updateExecutor.builder = this
    this._customFunctions = customFunctions
    this._serviceExecutor = null
    this._pathExecutor = null
  }

  /**
   * Set the BGP executor used to evaluate Basic Graph patterns
   * @param executor - Executor used to evaluate Basic Graph patterns
   */
  set bgpExecutor (executor: BGPExecutor) {
    this._bgpExecutor.builder = null
    this._bgpExecutor = executor
    this._bgpExecutor.builder = this
  }

  /**
   * Set the BGP executor used to evaluate Basic Graph patterns
   * @param executor - Executor used to evaluate Basic Graph patterns
   */
  set pathExecutor (executor: PathExecutor) {
    if (this._pathExecutor !== null) {
      this._pathExecutor.builder = null
    }
    this._pathExecutor = executor
    this._pathExecutor.builder = this
  }

  /**
   * Set the BGP executor used to evaluate SPARQL Aggregates
   * @param executor - Executor used to evaluate SPARQL Aggregates
   */
  set aggregateExecutor (executor: AggregateExecutor) {
    this._aggExecutor.builder = null
    this._aggExecutor = executor
    this._aggExecutor.builder = this
  }

  /**
   * Set the BGP executor used to evaluate SPARQL GRAPH clauses
   * @param executor - Executor used to evaluate SPARQL GRAPH clauses
   */
  set graphExecutor (executor: GraphExecutor) {
    this._graphExecutor.builder = null
    this._graphExecutor = executor
    this._graphExecutor.builder = this
  }

  /**
   * Set the BGP executor used to evaluate SPARQL UPDATE queries
   * @param executor - Executor used to evaluate SPARQL UPDATE queries
   */
  set updateExecutor (executor: UpdateExecutor) {
    this._updateExecutor.builder = null
    this._updateExecutor = executor
    this._updateExecutor.builder = this
  }

  /**
   * Set the executor used to evaluate SERVICE clauses
   * @param executor - Executor used to evaluate SERVICE clauses
   */
  set serviceExecutor (executor: ServiceExecutor) {
    if (this._serviceExecutor !== null) {
      this._serviceExecutor.builder = null
    }
    this._serviceExecutor = executor
    this._serviceExecutor.builder = this
  }

  /**
   * Build the physical query execution of a SPARQL 1.1 query
   * and returns an iterator that can be consumed to evaluate the query.
   * @param  query        - SPARQL query to evaluated
   * @param  options  - Execution options
   * @return An iterator that can be consumed to evaluate the query.
   */
  build (query: any, context?: ExecutionContext): Observable<QueryOutput> | Consumable {
    // If needed, parse the string query into a logical query execution plan
    if (typeof query === 'string') {
      query = this._parser.parse(query)
    }
    if (isNull(context) || isUndefined(context)) {
      context = new ExecutionContext()
    }
    switch (query.type) {
      case 'query':
        return this._buildQueryPlan(query, context)
      case 'update':
        return this._updateExecutor.execute(query.updates, context)
      default:
        throw new SyntaxError(`Unsupported SPARQL query type: ${query.type}`)
    }
  }

  /**
   * Build the physical query execution of a SPARQL query
   * @param  query         - Parsed SPARQL query
   * @param  options  - Execution options
   * @param  source - Source iterator
   * @return An iterator that can be consumed to evaluate the query.
   */
  _buildQueryPlan (query: Algebra.RootNode, context: ExecutionContext, source?: Observable<Bindings>): Observable<Bindings> {
    if (isNull(source) || isUndefined(source)) {
      // build pipeline starting iterator
      source = of(new BindingBase())
    }
    context.setProperty('prefixes', query.prefixes)

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
      return this._buildQueryPlan(construct, context, source)
    }

    // Handles FROM clauses
    if (query.from) {
      context.defaultGraphs = query.from.default
      context.namedGraphs = query.from.named
    }

    // Handles WHERE clause
    let graphIterator: Observable<Bindings>
    if (query.where != null && query.where.length > 0) {
      graphIterator = this._buildWhere(source, query.where, context)
    } else {
      graphIterator = of(new BindingBase())
    }

    // Parse query variable to separate projection & aggregate variables
    if ('variables' in query) {
      const parts = partition(query.variables, v => isString(v))
      aggregates = parts[1]
      // add aggregates variables to projection variables
      query.variables = parts[0].concat(aggregates.map(agg => (agg as Algebra.Aggregation).variable))
    }

    // Handles Aggregates
    graphIterator = this._aggExecutor.buildIterator(graphIterator, query, context, this._customFunctions)

    // Handles transformers
    if (aggregates.length > 0) {
      graphIterator = aggregates.reduce((obs: Observable<Bindings>, agg: Algebra.Aggregation) => {
        return obs.pipe(bind(agg.variable, agg.expression, this._customFunctions))
      }, graphIterator)
    }

    // Handles ORDER BY
    if ('order' in query) {
      graphIterator = orderby(graphIterator, query.order!)
    }

    if (!(query.queryType in QUERY_MODIFIERS)) {
      throw new Error(`Unsupported SPARQL query type: ${query.queryType}`)
    }
    graphIterator = QUERY_MODIFIERS[query.queryType](graphIterator, query, context)

    // Create iterators for modifiers
    if (query.distinct) {
      graphIterator = graphIterator.pipe(sparqlDistinct())
    }

    // Add offsets and limits if requested
    if ('offset' in query) {
      graphIterator = graphIterator.pipe(skip(query.offset!))
    }
    if ('limit' in query) {
      graphIterator = graphIterator.pipe(take(query.limit!))
    }
    // graphIterator.queryType = query.queryType
    return graphIterator
  }

  /**
   * Optimize a WHERE clause and build the corresponding physical plan
   * @param  source  - Source iterator
   * @param  groups   - WHERE clause to process
   * @param  options  - Execution options
   * @return An iterator used to evaluate the WHERE clause
   */
  _buildWhere (source: Observable<Bindings>, groups: Algebra.PlanNode[], context: ExecutionContext): Observable<Bindings> {
    groups = sortBy(groups, g => {
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
    if (some(groups, g => g.type === 'values')) {
      return this._buildValues(source, groups, context)
    }

    // merge BGPs on the same level
    let newGroups = []
    let prec = null
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i]
      if (group.type === 'bgp' && prec != null && prec.type === 'bgp') {
        let lastGroup = newGroups[newGroups.length - 1] as Algebra.BGPNode
        lastGroup.triples = lastGroup.triples.concat((group as Algebra.BGPNode).triples)
      } else {
        newGroups.push(group)
      }
      prec = groups[i]
    }
    groups = newGroups

    return groups.reduce((source, group) => {
      return this._buildGroup(source, group, context)
    }, source)
  }

  /**
   * Build a physical plan for a SPARQL group clause
   * @param  source  - Source iterator
   * @param  group   - SPARQL Group
   * @param  options - Execution options
   * @return An iterator used to evaluate the SPARQL Group
   */
  _buildGroup (source: Observable<Bindings>, group: Algebra.PlanNode, context: ExecutionContext): Observable<Bindings> {
    // Reset flags on the options for child iterators
    let childContext = context.clone()

    switch (group.type) {
      case 'bgp':
        if (isNull(this._bgpExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a Basic Graph Pattern without a BGPExecutor')
        }
        // find possible Property paths
        let [classicTriples, pathTriples, tempVariables] = extractPropertyPaths(group as Algebra.BGPNode)
        if (pathTriples.length > 0) {
          if (isNull(this._pathExecutor)) {
            throw new Error('A PlanBuilder cannot evaluate property paths without a PathExecutor')
          }
          source = this._pathExecutor.executeManyPaths(source, pathTriples, context)
        }

        // delegate remaining BGP evaluation to the dedicated executor
        let iter = this._bgpExecutor.buildIterator(source, classicTriples as Algebra.TripleObject[], childContext)

        // filter out variables added by the rewriting of property paths
        if (tempVariables.length > 0) {
          iter = iter.pipe(map(bindings => {
            return bindings.filter(v => tempVariables.indexOf(v) == -1)
          }))
        }
        return iter
      case 'query':
        return this._buildQueryPlan(group as Algebra.RootNode, childContext, source)
      case 'graph':
        if (isNull(this._graphExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a GRAPH clause without a GraphExecutor')
        }
        // delegate GRAPH evaluation to an executor
        return this._graphExecutor.buildIterator(source, group as Algebra.GraphNode, childContext)
      case 'service':
        if (isNull(this._serviceExecutor)) {
          throw new Error('A PlanBuilder cannot evaluate a SERVICE clause without a ServiceExecutor')
        }
        // delegate SERVICE evaluation to an executor
        return this._serviceExecutor.buildIterator(source, group as Algebra.ServiceNode, childContext)
      case 'group':
        return this._buildWhere(source, (group as Algebra.GroupNode).patterns, childContext)
      case 'optional':
        return optional(source, (group as Algebra.GroupNode).patterns, this, childContext)
      case 'union':
        return merge(...(group as Algebra.GroupNode).patterns.map(patternToken => {
          return this._buildGroup(source, patternToken, childContext)
        }))
      case 'minus':
        const rightSource = this._buildWhere(of(new BindingBase()), (group as Algebra.GroupNode).patterns, childContext)
        return minus(source, rightSource)
      case 'filter':
        const filter = group as Algebra.FilterNode
        // FILTERs (NOT) EXISTS are handled using dedicated operators
        switch (filter.expression.operator) {
          case 'exists':
            return exists(source, filter.expression.args, this, false, childContext)
          case 'notexists':
            return exists(source, filter.expression.args, this, true, childContext)
          default:
            return source.pipe(sparqlFilter(filter.expression, this._customFunctions))
        }
      case 'bind':
        const bindNode = group as Algebra.BindNode
        return source.pipe(bind(bindNode.variable, bindNode.expression, this._customFunctions))
      default:
        throw new Error(`Unsupported SPARQL group pattern found in query: ${group.type}`)
    }
  }

  /**
   * Build an iterator which evaluates a SPARQL query with VALUES clause(s).
   * It rely on a query rewritiing approach:
   * ?s ?p ?o . VALUES ?s { :1 :2 } becomes {:1 ?p ?o BIND(:1 AS ?s)} UNION {:2 ?p ?o BIND(:2 AS ?s)}
   * @param source  - Source iterator
   * @param groups  - Query body, i.e., WHERE clause
   * @param options - Execution options
   * @return An iterator which evaluates a SPARQL query with VALUES clause(s)
   */
  _buildValues (source: Observable<Bindings>, groups: Algebra.PlanNode[], context: ExecutionContext): Observable<Bindings> {
    let [ values, others ] = partition(groups, g => g.type === 'values')
    const bindingsLists = values.map(g => (g as Algebra.ValuesNode).values)
    // for each VALUES clause
    const iterators = bindingsLists.map(bList => {
      // for each value to bind in the VALUES clause
      const unionBranches = bList.map(b => {
        const bindings = BindingBase.fromObject(b)
        // BIND each group with the set of bindings and then evaluates it
        const temp = others.map(g => deepApplyBindings(g, bindings))
        return extendByBindings(this._buildWhere(source, temp, context), bindings)
      })
      return merge(...unionBranches)
    })
    // Users may use more than one VALUES clause
    if (iterators.length > 1) {
      return merge(...iterators)
    }
    return iterators[0]
  }
}
