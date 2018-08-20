/* file : aggregate-executor.js
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

const AggregateOperator = require('../../operators/aggregates/agg-operator.js')
const GroupByOperator = require('../../operators/aggregates/groupby-operator.js')

/**
 * An AggregateExecutor handles the evaluation of Aggregations operations,
 * GROUP BY and HAVING clauses in SPARQL queries.
 * @see https://www.w3.org/TR/sparql11-query/#aggregates
 * @author Thomas Minier
 */
class AggregateExecutor {
  /**
   * Build an iterator for the evaluation of SPARQL aggregations
   * @param  {AsyncIterator} source  - Source iterator
   * @param  {Object}       query   - Parsed SPARQL query (logical execution plan)
   * @param  {Object}       options - Execution options
   * @return {AsyncIterator} An iterator which evaluate SPARQL aggregations
   */
  buildIterator (source, query, options) {
    if ('group' in query && 'aggregates' in query && query.aggregates.length > 0) {
      // first, group bindings using the GROUP BY clause
      let iterator = this._executeGroupBy(source, query.group, options)
      // next, apply the optional HAVING clause to filter groups
      if ('having' in query) {
        iterator = this._executeHaving(source, query.having, options)
      }
      // finally, apply each aggregate operation over the aggregated bindings
      iterator = query.aggregates.reduce((iter, agg) => {
        return this._executeAggregate(iter, agg, options)
      }, iterator)
      return iterator
    }
    return source
  }

  /**
   * Build an iterator for the evaluation of a GROUP BY clause
   * @param  {AsyncIterator} source  - Source iterator
   * @param  {Object}       groupby - GROUP BY clause
   * @param  {Object}       options - Execution options
   * @return {AsyncIterator} An iterator which evaluate a GROUP BY clause
   */
  _executeGroupBy (source, groupby, options) {
    // TODO handle more than one variables & SPARQL expressions in GROUP BY
    return new GroupByOperator(source, [groupby[0].expression], options)
  }

  /**
   * Build an iterator for the evaluation of a SPARQL aggregation
   * @param  {AsyncIterator} source   - Source iterator
   * @param  {Object}       operation - SPARQL aggregation
   * @param  {Object}       options   - Execution options
   * @return {AsyncIterator} An iterator which evaluate a SPARQL aggregation
   */
  _executeAggregate (source, operation, options) {
    return new AggregateOperator(source, operation, options)
  }

  /**
   * Build an iterator for the evaluation of a HAVING clause
   * @param  {AsyncIterator} source  - Source iterator
   * @param  {Object}       having  - HAVING clause
   * @param  {Object}       options - Execution options
   * @return {AsyncIterator} An iterator which evaluate a HAVING clause
   */
  _executeHaving (source, having, options) {
    // TODO
    return source
  }
}

module.exports = AggregateExecutor
