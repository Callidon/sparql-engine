/* file : property-paths.js
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

const _ = require('lodash')

// rewriting rules for property paths

function transformPath (bgp, group, options) {
  let i = 0
  var queryChange = false
  var ret = [bgp, null, []]
  while (i < bgp.length && !queryChange) {
    var curr = bgp[i]
    if (typeof curr.predicate !== 'string' && curr.predicate.type === 'path') {
      switch (curr.predicate.pathType) {
        case '/':
          ret = pathSeq(bgp, curr, i, group, ret[2], options)
          if (ret[1] != null) {
            queryChange = true
          }
          break
        case '^':
          ret = pathInv(bgp, curr, i, group, ret[2], options)
          if (ret[1] != null) {
            queryChange = true
          }
          break
        case '|':
          ret = pathAlt(bgp, curr, i, group, ret[2], options)
          queryChange = true
          break
        case '!':
          ret = pathNeg(bgp, curr, i, group, ret[2], options)
          queryChange = true
          break
        default:
          break
      }
    }
    i++
  }
  return ret
}

function pathSeq (bgp, pathTP, ind, group, filter, options) {
  let s = pathTP.subject
  let p = pathTP.predicate
  let o = pathTP.object
  var union = null
  var newTPs = []
  var blank = '?tmp_' + Math.random().toString(36).substring(8)
  if (options.artificials == null) {
    options.artificials = []
  }
  options.artificials.push(blank)
  for (var j = 0; j < p.items.length; j++) {
    var newTP = {}
    if (j === 0) {
      newTP.subject = s
      newTP.predicate = p.items[j]
      newTP.object = blank
    } else {
      var prev = blank
      blank = '?tmp_' + Math.random().toString(36).substring(8)
      if (options.artificials == null) {
        options.artificials = []
      }
      options.artificials.push(blank)
      newTP.subject = prev
      newTP.predicate = p.items[j]
      newTP.object = blank
      if (j === p.items.length - 1) {
        newTP.object = o
      }
    }
    var recurs = transformPath([newTP], group, options)
    if (recurs[1] != null) {
      union = recurs[1]
      return [bgp, union, filter]
    }
    if (recurs[2] != null) {
      for (let i = 0; i < recurs[2].length; i++) {
        filter.push(recurs[2][i])
      }
    }
    var recursedBGP = recurs[0]
    recursedBGP.map(tp => newTPs.push(tp))
  }
  bgp[ind] = newTPs[0]
  for (var k = 1; k < newTPs.length; k++) {
    bgp.splice(ind + k, 0, newTPs[k])
  }
  return [bgp, union, filter]
}

function pathInv (bgp, pathTP, ind, group, filter, options) {
  var union = null
  let s = pathTP.subject
  let p = pathTP.predicate.items[0]
  let o = pathTP.object
  var newTP = {subject: o, predicate: p, object: s}
  var recurs = transformPath([newTP], group, options)
  if (recurs[1] != null) {
    union = recurs[1]
    return [bgp, union, filter]
  }
  if (recurs[2] != null) {
    for (let i = 0; i < recurs[2].length; i++) {
      filter.push(recurs[2][i])
    }
  }
  var recursedBGP = recurs[0]
  bgp[ind] = recursedBGP[0]
  if (recursedBGP.length > 1) {
    for (let i = 1; i < recursedBGP.length; i++) {
      bgp.push(recursedBGP[i])
    }
  }
  return [bgp, union, filter]
}

function pathAlt (bgp, pathTP, ind, group, filter, options) {
  var pathIndex = 0
  for (let i = 0; i < group.triples.length; i++) {
    if (containsPath(group.triples[i].predicate, pathTP)) {
      pathIndex = i
    }
  }
  // let s = pathTP.subject
  let p = pathTP.predicate.items
  // let o = pathTP.object
  var union = {type: 'union'}
  union.patterns = []
  for (let i = 0; i < p.length; i++) {
    var newBGP = _.cloneDeep(group)
    if (_.isEqual(newBGP.triples[pathIndex].predicate, pathTP.predicate)) {
      newBGP.triples[pathIndex].predicate = p[i]
    } else {
      replPath(newBGP.triples[pathIndex].predicate, pathTP, p[i])
    }
    union.patterns.push(newBGP)
  }
  bgp.splice(ind, 1)
  return [bgp, union, filter]
}

function pathNeg (bgp, pathTP, ind, group, filter, options) {
  var union = null
  let flt = null
  let s = pathTP.subject
  let p = pathTP.predicate.items[0]
  let o = pathTP.object
  var blank = '?tmp_' + Math.random().toString(36).substring(8)
  if (options.artificials == null) {
    options.artificials = []
  }
  options.artificials.push(blank)
  var newTP = {subject: s, predicate: blank, object: o}
  if (typeof p === 'string') {
    flt = {
      type: 'filter',
      expression: {
        type: 'operation',
        operator: '!=',
        args: [blank, p]
      }
    }
    filter.push(flt)
  } else {
    var preds = p.items
    for (let i = 0; i < preds.length; i++) {
      let pred = preds[i]
      flt = {
        type: 'filter',
        expression: {
          type: 'operation',
          operator: '!=',
          args: [blank, pred]
        }
      }
      filter.push(flt)
    }
  }
  bgp[ind] = newTP
  return [bgp, union, filter]
}

function containsPath (branch, path) {
  if (typeof branch === 'string') {
    return false
  } else if (branch === path.predicate) {
    return true
  } else {
    var result = false
    for (let i = 0; i < branch.items.length; i++) {
      if (containsPath(branch.items[i], path)) {
        result = true
      }
    }
    return result
  }
}

function replPath (tp, path, pred) {
  if (_.isEqual(tp, path.predicate)) {
    return true
  } else if (typeof tp !== 'string') {
    for (let i = 0; i < tp.items.length; i++) {
      if (replPath(tp.items[i], path, pred)) {
        tp.items[i] = pred
      }
    }
  }
}

module.exports = {
  transformPath
}
