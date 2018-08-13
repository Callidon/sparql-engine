/* file : utils.js
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

const { Duplex, PassThrough } = require('stream')
const { assign } = require('lodash')

/**
 * Bound a triple pattern using a set of bindings, i.e., substitute variables in the triple pattern
 * using the set of bindings provided
 * @param {Object} triple  - Triple pattern
 * @param {Object} bindings - Set of bindings
 * @return {function} An new, bounded triple pattern
 */
function applyBindings (triple, bindings) {
  const newTriple = Object.assign({}, triple)
  if (triple.subject.startsWith('?') && triple.subject in bindings) {
    newTriple.subject = bindings[triple.subject]
  }
  if (triple.predicate.startsWith('?') && triple.predicate in bindings) {
    newTriple.predicate = bindings[triple.predicate]
  }
  if (triple.object.startsWith('?') && triple.object in bindings) {
    newTriple.object = bindings[triple.object]
  }
  return newTriple
}

/**
 * Recusrively apply bindings to every triple in a SPARQL group pattern
 * @param  {Object} group - SPARQL group pattern to process
 * @param  {Object} bindings - Set of bindings to use
 * @return {Object} A new SPARQL group pattern with triples bounded
 */
function deepApplyBindings (group, bindings) {
  switch (group.type) {
    case 'bgp':
      return {
        type: 'bgp',
        triples: group.triples.map(t => applyBindings(t, bindings))
      }
    case 'group':
    case 'union':
      return {
        type: group.type,
        patterns: group.patterns.map(g => deepApplyBindings(g, bindings))
      }
    default:
      return group
  }
}

/**
 * Extends all set of bindings produced by an iterator with another set of bindings
 * @param  {AsyncIterator} iterator - Source terator
 * @param  {Object} bindings - Bindings added to each set of bindings procuded by the iterator
 * @return {AsyncIterator} An iterator that extends bindins produced by the source iterator
 */
function extendByBindings (iterator, bindings) {
  return iterator.map(b => assign(b, bindings))
}

/**
 * A MultiTransform is a Transform stream that uses intermediate Streams operators
 * to transform items.
 * @extends Duplex
 * @author Thomas Minier
 */
class MultiTransform extends Duplex {
  constructor () {
    super({ readableObjectMode: true, writableObjectMode: true })
    this._sources = []
    this._index = 0
  }

  _createTransformer (item) {
    return new PassThrough()
  }

  _write (item, encoding, done) {
    const it = this._createTransformer(item)
    this._sources.push(it)
    done()
  }

  _read (count) {
    const shouldContinue = this.push(this._sources[this._index].read())
    this._index = (this._index + 1) % this._sources.length
    if (shouldContinue) this._read(count)
  }
}

module.exports = {
  applyBindings,
  deepApplyBindings,
  extendByBindings,
  MultiTransform
}
