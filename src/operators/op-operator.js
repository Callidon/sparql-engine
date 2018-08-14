/* file : op-operator.js
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
const moment = require('moment')
const utils = require('../utils.js')
const crypto = require('crypto')

/**
 * @extends TransformIterator
 * @memberof Operators
 * @author Corentin Marionneau
 */
class OperationOperator extends TransformIterator {
  /**
   * Constructor
   * @memberof Operators
   * @param {AsyncIterator} source - The source operator
   */
  constructor (source, variable, options, bind) {
    super(source)
    this._variable = variable.variable
    this._expression = variable.expression
    this._options = options
    this._bind = bind
    var that = this
    this._currentItem = null
    if (this._options.bnode_count == null) {
      this._options.bnode_count = 0
    }
    source.on('error', err => this.emit('error', err))
    this._operators = {
      '+': function (args) {
        let a = args[0]
        let b = args[1]
        try {
          var parsedA = utils.parseBinding('null', a)
          var parsedB = utils.parseBinding('null', b)
          if (parsedA.datatype !== 'http://www.w3.org/2001/XMLSchema#string' && parsedB.datatype !== 'http://www.w3.org/2001/XMLSchema#string') {
            var res = Number(parsedA.value) + Number(parsedB.value)
            if (parsedA.datatype === parsedB.datatype) {
              return isNaN(res) ? null : this['strdt']([res, parsedA.datatype, true])
            } else {
              return isNaN(res) ? null : res
            }
          } else {
            return null
          }
        } catch (e) {
          return null
        }
      },

      '-': function (args) {
        let a = args[0]
        let b = args[1]
        try {
          var parsedA = utils.parseBinding('null', a)
          var parsedB = utils.parseBinding('null', b)
          if (parsedA.datatype !== 'http://www.w3.org/2001/XMLSchema#string' && parsedB.datatype !== 'http://www.w3.org/2001/XMLSchema#string') {
            var res = Number(parsedA.value) - Number(parsedB.value)
            return isNaN(res) ? null : res
          } else {
            return null
          }
        } catch (e) {
          return null
        }
      },

      '*': function (args) {
        let a = args[0]
        let b = args[1]
        try {
          var parsedA = utils.parseBinding('null', a)
          var parsedB = utils.parseBinding('null', b)
          if (parsedA.datatype !== 'http://www.w3.org/2001/XMLSchema#string' && parsedB.datatype !== 'http://www.w3.org/2001/XMLSchema#string') {
            var res = Number(parsedA.value) * Number(parsedB.value)
            return isNaN(res) ? null : res
          } else {
            return null
          }
        } catch (e) {
          return null
        }
      },

      '/': function (args) {
        let a = args[0]
        let b = args[1]
        try {
          var parsedA = utils.parseBinding('null', a)
          var parsedB = utils.parseBinding('null', b)
          if (parsedA.datatype !== 'http://www.w3.org/2001/XMLSchema#string' && parsedB.datatype !== 'http://www.w3.org/2001/XMLSchema#string') {
            if (Number(parsedB.value) === 0) {
              return null
            } else {
              var res = Number(parsedA.value) / Number(parsedB.value)
              var result = isNaN(res) ? null : (Number.isInteger(res) ? res.toFixed(1) : res)
              if (result != null) {
                result = this['strdt']([result, 'http://www.w3.org/2001/XMLSchema#decimal', true])
              }
              return result
            }
          } else {
            return null
          }
        } catch (e) {
          return null
        }
      },

      '=': function (args) {
        let a = args[0]
        let b = args[1]
        let parsedA = null
        try {
          parsedA = utils.parseBinding('null', a).value
        } catch (e) {
          // do nothing
        }
        let parsedB = null
        try {
          parsedB = utils.parseBinding('null', b).value
        } catch (e) {
          // do nothing
        }
        return parsedA === parsedB
      },

      '!=': function (args) {
        let a = args[0]
        let b = args[1]
        var parsedA = utils.parseBinding('null', a).value
        var parsedB = utils.parseBinding('null', b).value
        return parsedA !== parsedB
      },

      '<': function (args) {
        let a = args[0]
        let b = args[1]
        var parsedA = utils.parseBinding('null', a).value
        var parsedB = utils.parseBinding('null', b).value
        return parsedA < parsedB
      },

      '<=': function (args) {
        let a = args[0]
        let b = args[1]
        var parsedA = utils.parseBinding('null', a).value
        var parsedB = utils.parseBinding('null', b).value
        return parsedA <= parsedB
      },

      '>': function (args) {
        let a = args[0]
        let b = args[1]
        var parsedA = utils.parseBinding('null', a).value
        var parsedB = utils.parseBinding('null', b).value
        return parsedA > parsedB
      },

      '>=': function (args) {
        let a = args[0]
        let b = args[1]
        var parsedA = utils.parseBinding('null', a).value
        var parsedB = utils.parseBinding('null', b).value
        return parsedA >= parsedB
      },

      '!': function (args) {
        var a = args[0]
        var parsedA = utils.parseBinding('null', a).value
        return !parsedA
      },

      '&&': function (args) {
        let a = args[0]
        let b = args[1]
        var parsedA = utils.parseBinding('null', a).value
        var parsedB = utils.parseBinding('null', b).value
        return parsedA && parsedB
      },

      '||': function (args) {
        let a = args[0]
        let b = args[1]
        var parsedA = utils.parseBinding('null', a).value
        var parsedB = utils.parseBinding('null', b).value
        return parsedA || parsedB
      },

      'str': function (args) {
        var a = args[0]
        var parsed = utils.parseBinding('null', a)
        return '"' + parsed.value + '"'
      },

      'strlen': function (args) {
        var a = args[0]
        var parsedA = utils.parseBinding('null', a).value
        return parsedA.length
      },

      'strlang': function (args) {
        let a = args[0]
        let b = args[1]
        let parsed
        if (args[2] != null && args[2]) {
          parsed = {type: 'literal', value: a}
        } else {
          parsed = utils.parseBinding('null', a)
        }
        return (parsed.type === 'literal') ? '"' + parsed.value + '"' + '@' + JSON.parse(b) : null
      },

      'strdt': function (args) {
        let a = args[0]
        let b = args[1]
        let parsed
        if (args[2] != null && args[2]) {
          parsed = {type: 'literal', value: a}
        } else {
          parsed = utils.parseBinding('null', a)
        }
        return (parsed.type === 'literal') ? '"' + parsed.value + '"' + '^^<' + b + '>' : null
      },

      'substr': function (args) {
        let a = utils.parseBinding('null', args[0])
        let b = Number(utils.parseBinding('null', args[1]).value) - 1
        let c = null
        if (args.length > 2) {
          c = b + Number(utils.parseBinding('null', args[2]).value)
        }
        var res = (c != null) ? a.value.substring(b, c) : a.value.substring(b)
        switch (a.type) {
          case 'literal+type':
            return this['strdt']([res, a.datatype, true])
          case 'literal+lang':
            return this['strlang']([res, '"' + a.lang + '"', true])
          default:
            return res
        }
      },

      'isnumeric': function (args) {
        var a = utils.parseBinding('null', args[0]).value
        return !isNaN(a)
      },

      'abs': function (args) {
        var a = Number(utils.parseBinding('null', args[0]).value)
        if (isNaN(a)) {
          return null
        } else {
          return Math.abs(a)
        }
      },

      'ceil': function (args) {
        var a = Number(utils.parseBinding('null', args[0]).value)
        if (isNaN(a)) {
          return null
        } else {
          return Math.ceil(a)
        }
      },

      'floor': function (args) {
        var a = Number(utils.parseBinding('null', args[0]).value)
        if (isNaN(a)) {
          return null
        } else {
          return Math.floor(a)
        }
      },

      'round': function (args) {
        var a = Number(utils.parseBinding('null', args[0]).value)
        if (isNaN(a)) {
          return null
        } else {
          return Math.round(a)
        }
      },

      'concat': function (args) {
        var parsed = args.map(function (arg) { return utils.parseBinding('null', arg) })
        var vals = parsed.map(function (arg) { return arg.value })
        var res = _.join(vals, '')
        var sameType = true
        let type = parsed[0].type
        let sameDT = (type === 'literal+type')
        let sameLang = (type === 'literal+lang')
        let dt = (sameDT) ? parsed[0].datatype : null
        let lang = (sameLang) ? parsed[0].lang : null
        let invalidType = !!((sameDT && dt !== 'http://www.w3.org/2001/XMLSchema#string'))
        for (var i = 1; i < parsed.length; i++) {
          var elem = parsed[i]
          if (type !== elem.type) {
            sameType = false
          }
          if (elem.type === 'literal+type' && elem.datatype !== 'http://www.w3.org/2001/XMLSchema#string') {
            invalidType = true
          }
          if (dt !== elem.datatype) {
            sameDT = false
          }
          if (lang !== elem.lang) {
            sameLang = false
          }
        }
        if (invalidType) {
          return null
        } else if (sameType && sameDT) {
          return this['strdt']([res, dt, true])
        } else if (sameType && sameLang) {
          return this['strlang']([res, '"' + lang + '"', true])
        } else {
          return res
        }
      },

      'ucase': function (args) {
        var a = utils.parseBinding('null', args[0])
        var res = a.value.toUpperCase()
        switch (a.type) {
          case 'literal+type':
            return this['strdt']([res, a.datatype, true])
          case 'literal+lang':
            return this['strlang']([res, '"' + a.lang + '"', true])
          default:
            return res
        }
      },

      'lcase': function (args) {
        var a = utils.parseBinding('null', args[0])
        var res = a.value.toLowerCase()
        switch (a.type) {
          case 'literal+type':
            return this['strdt']([res, a.datatype, true])
          case 'literal+lang':
            return this['strlang']([res, '"' + a.lang + '"', true])
          default:
            return res
        }
      },

      'encode_for_uri': function (args) {
        return encodeURI(utils.parseBinding('null', args[0]).value)
      },

      'contains': function (args) {
        let a = utils.parseBinding('null', args[0]).value
        let b = utils.parseBinding('null', args[1]).value
        return a.indexOf(b) >= 0
      },

      'strstarts': function (args) {
        let a = String(utils.parseBinding('null', args[0]).value)
        let b = String(utils.parseBinding('null', args[1]).value)
        return a.startsWith(b)
      },

      'strends': function (args) {
        let a = String(utils.parseBinding('null', args[0]).value)
        let b = String(utils.parseBinding('null', args[1]).value)
        return a.endsWith(b)
      },

      'md5': function (args) {
        var value = utils.parseBinding('null', args[0]).value
        var md5 = crypto.createHash('md5')
        md5.update(value)
        return md5.digest('hex')
      },

      'sha1': function (args) {
        var value = utils.parseBinding('null', args[0]).value
        var sha1 = crypto.createHash('sha1')
        sha1.update(value)
        return sha1.digest('hex')
      },

      'sha256': function (args) {
        var value = utils.parseBinding('null', args[0]).value
        var sha256 = crypto.createHash('sha256')
        sha256.update(value)
        return sha256.digest('hex')
      },

      'sha512': function (args) {
        var value = utils.parseBinding('null', args[0]).value
        var sha512 = crypto.createHash('sha512')
        sha512.update(value)
        return sha512.digest('hex')
      },

      'hours': function (args) {
        try {
          var date = moment.parseZone(utils.parseBinding('null', args[0]).value)
          return this['strdt']([date.hours(), 'http://www.w3.org/2001/XMLSchema#integer', true])
        } catch (e) {
          return null
        }
      },

      'minutes': function (args) {
        try {
          var date = moment.parseZone(utils.parseBinding('null', args[0]).value)
          return this['strdt']([date.minutes(), 'http://www.w3.org/2001/XMLSchema#integer', true])
        } catch (e) {
          return null
        }
      },

      'seconds': function (args) {
        try {
          var date = moment.parseZone(utils.parseBinding('null', args[0]).value)
          return this['strdt']([date.seconds(), 'http://www.w3.org/2001/XMLSchema#decimal', true])
        } catch (e) {
          return null
        }
      },

      'year': function (args) {
        try {
          var date = moment.parseZone(utils.parseBinding('null', args[0]).value)
          return this['strdt']([date.year(), 'http://www.w3.org/2001/XMLSchema#integer', true])
        } catch (e) {
          return null
        }
      },

      'month': function (args) {
        try {
          var date = moment.parseZone(utils.parseBinding('null', args[0]).value)
          return this['strdt']([date.month() + 1, 'http://www.w3.org/2001/XMLSchema#integer', true])
        } catch (e) {
          return null
        }
      },

      'day': function (args) {
        try {
          var date = moment.parseZone(utils.parseBinding('null', args[0]).value)
          return this['strdt']([date.date(), 'http://www.w3.org/2001/XMLSchema#integer', true])
        } catch (e) {
          return null
        }
      },

      'timezone': function (args) {
        try {
          var value = utils.parseBinding('null', args[0]).value
          if (value.length < 20) {
            return null
          } else {
            var date = moment.parseZone(utils.parseBinding('null', args[0]).value)
            var zone = date.utcOffset() / 60
            if (zone > 0) {
              zone = 'PT' + zone + 'H'
            } else if (zone < 0) {
              zone = '-PT' + Math.abs(zone) + 'H'
            } else {
              zone = 'PT0S'
            }
            return this['strdt']([zone, 'http://www.w3.org/2001/XMLSchema#dayTimeDuration', true])
          }
        } catch (e) {
          return null
        }
      },

      'tz': function (args) {
        return utils.parseBinding('null', args[0]).value.slice(19)
      },

      'BNODE': function (args) {
        let value = null
        if (args.length > 0) {
          value = utils.parseBinding('null', args[0]).value
        }
        if (that._options.artificials == null) {
          that._options.artificials = []
        }
        if (!that._options.artificials.includes('bnode_map')) {
          that._options.artificials.push('bnode_map')
        }

        let bnode = null
        if (that._currentItem.bnode_map != null) {
          if (that._currentItem.bnode_map[value] != null && value != null) {
            bnode = that._currentItem.bnode_map[value]
          } else {
            bnode = 'b' + that._options.bnode_count
            that._currentItem.bnode_map[value] = bnode
            that._options.bnode_count++
          }
        } else {
          that._currentItem.bnode_map = {}
          bnode = 'b' + that._options.bnode_count
          that._currentItem.bnode_map[value] = bnode
          that._options.bnode_count++
        }
        return bnode
      },

      'in': function (args) {
        let a = utils.parseBinding('null', args[0])
        let b = args[1].map(elem => utils.parseBinding('null', elem))
        var filteredDT = _.filter(b, {type: a.type, value: a.value, datatype: a.datatype})
        var filteredLang = _.filter(b, {type: a.type, value: a.value, lang: a.lang})
        return filteredDT.length > 0 || filteredLang.length > 0
      },

      'notin': function (args) {
        let a = utils.parseBinding('null', args[0])
        let b = args[1].map(elem => utils.parseBinding('null', elem))
        var filteredDT = _.filter(b, {type: a.type, value: a.value, datatype: a.datatype})
        var filteredLang = _.filter(b, {type: a.type, value: a.value, lang: a.lang})
        return filteredDT.length === 0 && filteredLang.length === 0
      },

      'now': function (args) {
        try {
          var date = moment().format()
          return this['strdt']([date, 'http://www.w3.org/2001/XMLSchema#dateTime', true])
        } catch (e) {
          return null
        }
      },

      'rand': function (args) {
        try {
          var rand = Math.random()
          return this['strdt']([rand, 'http://www.w3.org/2001/XMLSchema#double', true])
        } catch (e) {
          return null
        }
      },

      'iri': function (args) {
        try {
          var value = utils.parseBinding('null', args[0]).value
          var prefix = that._options.base || ''
          return prefix + value
        } catch (e) {
          return null
        }
      },

      'uri': function (args) {
        try {
          var value = utils.parseBinding('null', args[0]).value
          var prefix = that._options.base || ''
          return prefix + value
        } catch (e) {
          return null
        }
      },

      'lang': function (args) {
        try {
          return utils.parseBinding('null', args[0]).lang.toLowerCase()
        } catch (e) {
          return null
        }
      },

      'if': function (args) {
        if (args[0]) {
          return args[1]
        } else if (args[0] === null) {
          return null
        } else {
          return args[2]
        }
      },

      'coalesce': function (args) {
        var vals = _.without(args, undefined, null)
        return (vals.length > 0) ? vals[0] : null
      },

      'strbefore': function (args) {
        try {
          let a = utils.parseBinding('null', args[0])
          let b = utils.parseBinding('null', args[1])
          if (b.lang != null && b.lang !== a.lang) {
            return null
          } else if (a.datatype != null && b.datatype != null && b.datatype !== a.datatype) {
            return null
          } else {
            var end = a.value.indexOf(b.value)
            var type = a.type
            var res = (end >= 0) ? a.value.slice(0, end) : ''
            if (type === 'literal+type') {
              return (a.datatype === 'http://www.w3.org/2001/XMLSchema#string') ? this['strdt']([res, a.datatype, true]) : res
            } else if (type === 'literal+lang') {
              return this['strlang']([res, '"' + a.lang + '"', true])
            } else {
              return res
            }
          }
        } catch (e) {
          return null
        }
      },

      'strafter': function (args) {
        try {
          let a = utils.parseBinding('null', args[0])
          let b = utils.parseBinding('null', args[1])
          if (b.lang != null && b.lang !== a.lang) {
            return null
          } else if (a.datatype != null && b.datatype != null && b.datatype !== a.datatype) {
            return null
          } else {
            var start = a.value.indexOf(b.value)
            var type = a.type
            var res = (start >= 0) ? a.value.slice(start + b.value.length) : ''
            if (type === 'literal+type') {
              return (a.datatype === 'http://www.w3.org/2001/XMLSchema#string') ? this['strdt']([res, a.datatype, true]) : res
            } else if (type === 'literal+lang') {
              return this['strlang']([res, '"' + a.lang + '"', true])
            } else {
              return res
            }
          }
        } catch (e) {
          return null
        }
      },

      'replace': function (args) {
        let a = utils.parseBinding('null', args[0])
        let b = utils.parseBinding('null', args[1]).value
        let c = utils.parseBinding('null', args[2]).value
        if (a.datatype != null && a.datatype !== 'http://www.w3.org/2001/XMLSchema#string') {
          return null
        } else {
          try {
            b = new RegExp(b, 'g')
            return a.value.replace(b, c)
          } catch (e) {
            b = utils.parseBinding('null', args[1]).value
            return a.value.replace(b, c)
          }
        }
      },

      'datatype': function (args) {
        try {
          return utils.parseBinding('null', args[0]).datatype
        } catch (e) {
          return null
        }
      },

      'select': function (args) {
        try {
          return args[0]
        } catch (e) {
          return null
        }
      }

    }
  }

  /**
  /**
   * _read implementation: buffer all values in memory, apply aggregate  function
   * and then, ouput them.
   * @private
   * @return {void}
   */
  _transform (item, done) {
    this._currentItem = item
    var value = this.applyOperator(item, this._expression)
    if (this._bind) {
      if (item[this._variable] != null) {
        item[this._variable] = null
      } else {
        if (value != null) {
          item[this._variable] = value.toString()
        }
      }
    } else {
      if (value != null) {
        item[this._variable] = value.toString()
      }
    }
    this._push(item)
    done()
  }

  applyOperator (item, expression) {
    var expr = _.cloneDeep(expression)
    var operator = expr.operator || 'select'
    var args = expr.args || [expr] || []
    for (var i = 0; i < args.length; i++) {
      if (typeof args[i] === 'object' && !Array.isArray(args[i])) {
        args[i] = this.applyOperator(item, args[i])
      } else if (typeof args[i] === 'string' && args[i].startsWith('?')) {
        if (Array.isArray(item.group) && item[args[i]] == null) {
          args[i] = item.group[0][args[i]]
        } else {
          args[i] = item[args[i]]
        }
      }
    }
    var func = this._operators[operator]
    if (func != null) {
      return this._operators[operator](args)
    } else {
      throw new Error('Operation not implemented : ' + operator)
    }
  }
}

module.exports = OperationOperator
