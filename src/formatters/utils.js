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

module.exports = {
  parseBinding
}
