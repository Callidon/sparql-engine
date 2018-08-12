/* file : gb-operator.js
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

const { BufferedIterator } = require('asynciterator')

/**
 * GroupByOperator applies a GROUPBY aggregation on the output of another operator.
 * @extends BufferedIterator
 * @memberof Operators
 * @author Corentin Marionneau
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#sparqlGroupAggregate}
 */
class GroupByOperator extends BufferedIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source - The source operator
   */
  constructor (source, group) {
    super(source)
    if (group === '*') {
      this._groupby = '*'
    } else {
      this._groupby = group.expression
    }
    this._bufferedValues = []
    this._readingFromSource = false
    this._isSorted = false
    this._descending = false
    this._source = source
  }

  /**
  /**
   * _read implementation: buffer all values in memory, aggregate them
   * and then, ouput them.
   * @private
   * @return {void}
   */
  _read (item, done) {
    if (!this._readingFromSource) {
      this._readingFromSource = true
      this._source.on('data', d => this._bufferedValues.push(d))
      this._source.on('end', () => {
        this._bufferedValues = this._groupBy(this._bufferedValues, this._groupby)
        this._isAggregated = true
        this._read(item, done)
      })
    } else {
      if (this._isAggregated && this._bufferedValues.length === 0) {
        this.close()
      } else if (this._isAggregated) {
        this._push(this._bufferedValues.pop())
      }
      done()
    }
  }

  _groupBy (values, groupby) {
    if (groupby === '*') {
      return [{group: values}]
    } else {
      var aggregates = []
      var hashAgg = {}
      for (var i = 0; i < values.length; i++) {
        var binding = values[i]
        var gbElem = binding[groupby]
        delete binding[groupby]
        var rest = binding

        if (hashAgg[gbElem] != null) {
          hashAgg[gbElem].group.push(rest)
        } else {
          hashAgg[gbElem] = {}
          hashAgg[gbElem][groupby] = gbElem
          hashAgg[gbElem].group = []
          hashAgg[gbElem].group.push(rest)
        }
      }
      for (var agg in hashAgg) {
        aggregates.push(hashAgg[agg])
      }
      return aggregates
    }
  }
}

module.exports = GroupByOperator
