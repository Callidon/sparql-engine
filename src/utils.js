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
 * Return a high-order function to apply bindings to a given triple pattern
 * @param  {Object} triple   - A triple pattern on which bindings will be inkected
 * @return {function} Function callbale with a set of bindings,
 * which returns `null` if no substitution was found, otheriwse returns a RDF triple
 */
function applyBindings (triple, bindings) {
  const subjVar = triple.subject.startsWith('?')
  const predVar = triple.predicate.startsWith('?')
  const objVar = triple.object.startsWith('?')
  const newTriple = Object.assign({}, triple)
  if (subjVar && triple.subject in bindings) {
    newTriple.subject = bindings[triple.subject]
  }
  if (predVar && triple.predicate in bindings) {
    newTriple.predicate = bindings[triple.predicate]
  }
  if (objVar && triple.object in bindings) {
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
 * @param  {[type]} iterator    [description]
 * @param  {[type]} bindings [description]
 * @return {[type]}             [description]
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
