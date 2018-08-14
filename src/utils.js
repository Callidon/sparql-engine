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
const n3utils = require('n3').Util

function IRIDescriptor (variable, iri) {
  return {
    type: 'iri',
    variable,
    value: iri
  }
}

function RawLiteralDescriptor (variable, literal) {
  return {
    type: 'literal',
    variable,
    value: literal
  }
}

function TypedLiteralDescriptor (variable, literal, type) {
  return {
    type: 'literal+type',
    variable,
    value: literal,
    datatype: type
  }
}

function LangLiteralDescriptor (variable, literal, lang) {
  return {
    type: 'literal+lang',
    variable,
    value: literal,
    lang
  }
}

function stripDatatype (datatype) {
  if (datatype.startsWith('<') && datatype.endsWith('>')) {
    return datatype.slice(1, datatype.length - 1)
  }
  return datatype
}

/**
 * Parse a solution binding and return a descriptor with its type and value
 * @param  {string} variable - The SPARQL variable that the binding bound
 * @param  {string} binding - The binding in string format (i.e., URI or Literal)
 * @return {Object} A descriptor for the binding
 */
function parseBinding (variable, binding) {
  if (n3utils.isIRI(binding)) {
    return IRIDescriptor(variable, binding)
  } else if (n3utils.isLiteral(binding)) {
    const value = n3utils.getLiteralValue(binding)
    const lang = n3utils.getLiteralLanguage(binding)
    const type = stripDatatype(n3utils.getLiteralType(binding))
    if (lang !== null && lang !== undefined && lang !== '') {
      return LangLiteralDescriptor(variable, value, lang)
    } else if (binding.indexOf('^^') > -1) {
      return TypedLiteralDescriptor(variable, value, type)
    }
    return RawLiteralDescriptor(variable, value)
  } else {
    throw new Error(`Binding with unexpected type encoutered during formatting: ${binding}`)
  }
}

/**
 * Create a RDF triple in Object representation
 * @param  {string} subj - Triple's subject
 * @param  {string} pred - Triple's predicate
 * @param  {string} obj  - Triple's object
 * @return {Object} A RDF triple in Object representation
 */
function triple (subj, pred, obj) {
  return {
    subject: subj,
    predicate: pred,
    object: obj
  }
}

/**
 * Return True if a string is a SPARQL variable
 * @param  {string}  str - String to test
 * @return {Boolean} True if the string is a SPARQL variable, False otherwise
 */
function isVariable (str) {
  if (typeof str !== 'string') {
    return false
  }
  return str.startsWith('?')
}

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
    case 'optional':
    case 'service':
    case 'union':
      return {
        type: group.type,
        patterns: group.patterns.map(g => deepApplyBindings(g, bindings))
      }
    case 'query':
      group.where = group.where.map(g => deepApplyBindings(g, bindings))
      return group
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
  rdf: {
    isVariable,
    triple
  },
  applyBindings,
  deepApplyBindings,
  extendByBindings,
  parseBinding,
  MultiTransform
}
