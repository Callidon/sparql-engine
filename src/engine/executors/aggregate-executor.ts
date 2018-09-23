/* file : aggregate-executor.ts
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

import Executor from './executor'
import BindOperator from '../../operators/bind-operator'
import FilterOperator from '../../operators/filter-operator'
import GroupByOperator from '../../operators/aggregates/groupby-operator'
import { isString } from 'lodash'
import { Algebra } from 'sparqljs'
import { AsyncIterator } from 'asynciterator'
import { Bindings } from '../../rdf/bindings'

/**
 * An AggregateExecutor handles the evaluation of Aggregations operations,
 * GROUP BY and HAVING clauses in SPARQL queries.
 * @see https://www.w3.org/TR/sparql11-query/#aggregates
 * @author Thomas Minier
 */
export default class AggregateExecutor extends Executor {
  /**
   * Build an iterator for the evaluation of SPARQL aggregations
   * @param source  - Source iterator
   * @param query   - Parsed SPARQL query (logical execution plan)
   * @param options - Execution options
   * @return An iterator which evaluate SPARQL aggregations
   */
  buildIterator (source: AsyncIterator<Bindings>, query: Algebra.RootNode, options: Object): AsyncIterator<Bindings> {
    if ('group' in query) {
      // first, group bindings using the GROUP BY clause
      let iterator = this._executeGroupBy(source, query.group || [], options)
      // next, apply the optional HAVING clause to filter groups
      if ('having' in query) {
        iterator = this._executeHaving(iterator, query.having || [], options)
      }
      return iterator
    }
    return source
  }

  /**
   * Build an iterator for the evaluation of a GROUP BY clause
   * @param source  - Source iterator
   * @param  groupby - GROUP BY clause
   * @param  options - Execution options
   * @return An iterator which evaluate a GROUP BY clause
   */
  _executeGroupBy (source: AsyncIterator<Bindings>, groupby: Algebra.Aggregation[], options: Object): AsyncIterator<Bindings> {
    let iterator = source
    // extract GROUP By variables & rewrite SPARQL expressions into BIND clauses
    const variables: string[] = []
    groupby.forEach(g => {
      if (isString(g.expression)) {
        variables.push(g.expression)
      } else {
        variables.push(g.variable)
        iterator = new BindOperator(iterator, g.variable, g.expression, options)
      }
    })
    return new GroupByOperator(iterator, variables, options)
  }

  /**
   * Build an iterator for the evaluation of a HAVING clause
   * @param  source  - Source iterator
   * @param  having  - HAVING clause
   * @param  options - Execution options
   * @return An iterator which evaluate a HAVING clause
   */
  _executeHaving (source: AsyncIterator<Bindings>, having: Algebra.Expression[], options: Object): AsyncIterator<Bindings> {
    // thanks to the flexibility of SPARQL expressions,
    // we can rewrite a HAVING clause in a set of FILTER clauses!
    return having.reduce((iter, expression) => {
      return new FilterOperator(iter, expression, options)
    }, source)
  }
}
