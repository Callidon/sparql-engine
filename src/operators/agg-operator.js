/* file : agg-operator.js
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

const { TransformIterator } = require('asynciterator')
const _ = require('lodash')
const utils = require('../utils.js')

/**
 * GroupByOperator applies a DISTINCT modifier on the output of another operator.
 * @extends TransformIterator
 * @memberof Operators
 * @author Corentin Marionneau
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#sparqlGroupAggregate}
 */
class AggrOperator extends TransformIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source - The source operator
   */
  constructor (source, variable) {
    super(source)
    this._variable = variable
    source.on('error', err => this.emit('error', err))
  }

  /**
  /**
   * _read implementation: buffer all values in memory, apply aggregate  function
   * and then, ouput them.
   * @private
   * @return {void}
   */
  _transform (item, done) {
    if (this._variable.expression.aggregation != null) {
      switch (this._variable.expression.aggregation) {
        case 'count':
          item = this._doCount(item)
          this._push(item)
          break

        case 'sum':
          item = this._doSum(item)
          this._push(item)
          break

        case 'min':
          item = this._doMin(item)
          this._push(item)
          break

        case 'max':
          item = this._doMax(item)
          this._push(item)
          break

        case 'avg':
          item = this._doAvg(item)
          this._push(item)
          break

        case 'sample':
          item = this._doSample(item)
          this._push(item)
          break

        case 'group_concat':
          item = this._doConcat(item)
          this._push(item)
          break

        default:
          this._push(item)
      }
    } else {
      this._push(item)
    }
    done()
  }

  _doCount (item) {
    var aggVar = this._variable.expression.expression
    var alias = this._variable.variable
    var dist = this._variable.expression.distinct
    var count = 0
    if (aggVar === '*') {
      count = item.group.length
    } else {
      if (dist) {
        var hash = {}
        for (let i = 0; i < item.group.length; i++) {
          let bindings = item.group[i]
          if (bindings[aggVar] != null && hash[bindings[aggVar]] == null) {
            hash[bindings[aggVar]] = true
            count += 1
          }
        }
      } else {
        for (let i = 0; i < item.group.length; i++) {
          let bindings = item.group[i]
          if (bindings[aggVar] != null) {
            count += 1
          }
        }
      }
    }
    item[alias] = count.toString()
    return item
  }

  _doSum (item) {
    var aggVar = this._variable.expression.expression
    var alias = this._variable.variable
    var dist = this._variable.expression.distinct
    var vals = []
    var notNumbers = false
    if (dist) {
      var hash = {}
      for (var i = 0; i < item.group.length; i++) {
        var bindings = item.group[i]
        var val = utils.parseBinding(aggVar, bindings[aggVar]).value
        if (val != null && hash[val] == null) {
          if (isNaN(val)) {
            notNumbers = true
          } else {
            hash[val] = true
            vals.push(Number(val))
          }
        }
      }
    } else {
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        let val = utils.parseBinding(aggVar, bindings[aggVar]).value
        if (val != null) {
          if (isNaN(val)) {
            notNumbers = true
          } else {
            vals.push(Number(val))
          }
        }
      }
    }
    if (notNumbers) {
      item[alias] = 'null'
    } else {
      var sum = _.sum(vals)
      item[alias] = (Math.round(sum * 100) / 100).toString()
    }
    return item
  }

  _doMin (item) {
    var aggVar = this._variable.expression.expression
    var alias = this._variable.variable
    var dist = this._variable.expression.distinct
    var vals = []
    var valMap = {}
    var notNumbers = false
    if (dist) {
      var hash = {}
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        let val = utils.parseBinding(aggVar, bindings[aggVar]).value
        if (val != null && hash[val] == null) {
          if (isNaN(val)) {
            notNumbers = true
          } else {
            hash[val] = true
            valMap[Number(val)] = val
            vals.push(Number(val))
          }
        }
      }
    } else {
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        let val = utils.parseBinding(aggVar, bindings[aggVar]).value
        if (val != null) {
          if (isNaN(val)) {
            notNumbers = true
          } else {
            valMap[Number(val)] = val
            vals.push(Number(val))
          }
        }
      }
    }
    if (notNumbers) {
      item[alias] = 'null'
    } else {
      item[alias] = valMap[(Math.min(...vals))].toString()
    }
    return item
  }

  _doMax (item) {
    var aggVar = this._variable.expression.expression
    var alias = this._variable.variable
    var dist = this._variable.expression.distinct
    var vals = []
    var valMap = {}
    var notNumbers = false
    if (dist) {
      var hash = {}
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        let val = utils.parseBinding(aggVar, bindings[aggVar]).value
        if (val != null && hash[val] == null) {
          if (isNaN(val)) {
            notNumbers = true
          } else {
            hash[val] = true
            valMap[Number(val)] = val
            vals.push(Number(val))
          }
        }
      }
    } else {
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        let val = utils.parseBinding(aggVar, bindings[aggVar]).value
        if (val != null) {
          if (isNaN(val)) {
            notNumbers = true
          } else {
            valMap[Number(val)] = val
            vals.push(Number(val))
          }
        }
      }
    }
    if (notNumbers) {
      item[alias] = 'null'
    } else {
      item[alias] = valMap[(Math.max(...vals))]
    }
    return item
  }

  _doAvg (item) {
    var aggVar = this._variable.expression.expression
    var alias = this._variable.variable
    var dist = this._variable.expression.distinct
    var vals = []
    var notNumbers = false
    if (dist) {
      var hash = {}
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        let val = utils.parseBinding(aggVar, bindings[aggVar]).value
        if (val != null && hash[val] == null) {
          if (val.startsWith('"') || val.startsWith("'")) {
            val = val.slice(1, -1)
          }
          if (isNaN(val)) {
            notNumbers = true
          } else {
            hash[val] = true
            vals.push(Number(val))
          }
        }
      }
    } else {
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        let val = utils.parseBinding(aggVar, bindings[aggVar]).value
        if (val != null) {
          if (val.startsWith('"') || val.startsWith("'")) {
            val = val.slice(1, -1)
          }
          if (isNaN(val)) {
            notNumbers = true
          } else {
            vals.push(Number(val))
          }
        }
      }
    }
    if (notNumbers) {
      item[alias] = 'null'
    } else {
      var average = _.mean(vals)
      item[alias] = (Math.round(average * 100) / 100).toString()
    }
    return item
  }

  _doSample (item) {
    var aggVar = this._variable.expression.expression
    var alias = this._variable.variable
    var dist = this._variable.expression.distinct
    if (dist) {
      var hash = {}
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        if (bindings[aggVar] != null && hash[bindings[aggVar]] == null) {
          hash[bindings[aggVar]] = true
        }
      }
      let valueSet = []
      for (let val in hash) {
        valueSet.push(val)
      }
      var rand = Math.floor(Math.random() * Math.floor(valueSet.length))
      item[alias] = valueSet[rand]
    } else {
      let valueSet = []
      for (let i = 0; i < item.group.length; i++) {
        var bindings = item.group[i]
        valueSet.push(bindings[aggVar])
      }
      let rand = Math.floor(Math.random() * Math.floor(valueSet.length))
      item[alias] = valueSet[rand]
    }

    return item
  }

  _doConcat (item) {
    var aggVar = this._variable.expression.expression
    var alias = this._variable.variable
    var dist = this._variable.expression.distinct
    var sep = this._variable.expression.separator
    if (dist) {
      var hash = {}
      for (let i = 0; i < item.group.length; i++) {
        let bindings = item.group[i]
        if (bindings[aggVar] != null && hash[bindings[aggVar]] == null) {
          hash[bindings[aggVar]] = true
        }
      }
      let valueSet = []
      for (let val in hash) {
        valueSet.push(val)
      }
      item[alias] = valueSet.join(sep)
    } else {
      let valueSet = []
      for (let i = 0; i < item.group.length; i++) {
        var bindings = item.group[i]
        valueSet.push(JSON.parse(bindings[aggVar]))
      }
      item[alias] = '"' + valueSet.join(sep) + '"'
    }
    return item
  }
}

module.exports = AggrOperator
