/* file : custom-operations.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

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

import { Term } from 'rdf-js'
import { rdf } from '../../utils'

/**
 * Implementation of NON standard SPARQL operations offered by the framework
 * All arguments are pre-compiled from string to RDF.js terms
 * @author Thomas Minier
 */
export default {
  /*
    Hyperbolic functions (cosh, sinh, tanh, ...)
    https://en.wikipedia.org/wiki/Hyperbolic_function
  */

  // Hyperbolic cosinus
  'https://callidon.github.io/sparql-engine/functions#cosh': function (x: Term): Term {
    if (rdf.termIsLiteral(x) && rdf.literalIsNumeric(x)) {
      const value = rdf.asJS(x.value, x.datatype.value)
      return rdf.createFloat(Math.cosh(value))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the hyperbolic cosinus of ${x}, as it is not a number`)
  },

  // Hyperbolic sinus
  'https://callidon.github.io/sparql-engine/functions#sinh': function (x: Term): Term {
    if (rdf.termIsLiteral(x) && rdf.literalIsNumeric(x)) {
      const value = rdf.asJS(x.value, x.datatype.value)
      return rdf.createFloat(Math.sinh(value))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the hyperbolic sinus of ${x}, as it is not a number`)
  },

  // Hyperbolic tangent
  'https://callidon.github.io/sparql-engine/functions#tanh': function (x: Term): Term {
    if (rdf.termIsLiteral(x) && rdf.literalIsNumeric(x)) {
      const value = rdf.asJS(x.value, x.datatype.value)
      return rdf.createFloat(Math.tanh(value))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the hyperbolic tangent of ${x}, as it is not a number`)
  },

  // Hyperbolic cotangent
  'https://callidon.github.io/sparql-engine/functions#coth': function (x: Term): Term {
    if (rdf.termIsLiteral(x) && rdf.literalIsNumeric(x)) {
      const value = rdf.asJS(x.value, x.datatype.value)
      if (value === 0) {
        throw new SyntaxError(`SPARQL expression error: cannot compute the hyperbolic cotangent of ${x}, as it is equals to 0`)
      }
      return rdf.createFloat((Math.exp(2 * value) + 1) / (Math.exp(2 * value) - 1))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the hyperbolic cotangent of ${x}, as it is not a number`)
  },

  // Hyperbolic secant
  'https://callidon.github.io/sparql-engine/functions#sech': function (x: Term): Term {
    if (rdf.termIsLiteral(x) && rdf.literalIsNumeric(x)) {
      const value = rdf.asJS(x.value, x.datatype.value)
      return rdf.createFloat((2 * Math.exp(value)) / (Math.exp(2 * value) + 1))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the hyperbolic secant of ${x}, as it is not a number`)
  },

  // Hyperbolic cosecant
  'https://callidon.github.io/sparql-engine/functions#csch': function (x: Term): Term {
    if (rdf.termIsLiteral(x) && rdf.literalIsNumeric(x)) {
      const value = rdf.asJS(x.value, x.datatype.value)
      return rdf.createFloat((2 * Math.exp(value)) / (Math.exp(2 * value) - 1))
    }
    throw new SyntaxError(`SPARQL expression error: cannot compute the hyperbolic cosecant of ${x}, as it is not a number`)
  },

  /*
    Radians to Degree & Degrees to Randians transformations
  */
  'https://callidon.github.io/sparql-engine/functions#toDegrees': function (x: Term): Term {
    if (rdf.termIsLiteral(x) && rdf.literalIsNumeric(x)) {
      const value = rdf.asJS(x.value, x.datatype.value)
      return rdf.createFloat(value * (180 / Math.PI))
    }
    throw new SyntaxError(`SPARQL expression error: cannot convert ${x} to degrees, as it is does not look like radians`)
  },

  'https://callidon.github.io/sparql-engine/functions#toRadians': function (x: Term): Term {
    if (rdf.termIsLiteral(x) && rdf.literalIsNumeric(x)) {
      const value = rdf.asJS(x.value, x.datatype.value)
      return rdf.createFloat(value * (Math.PI / 180))
    }
    throw new SyntaxError(`SPARQL expression error: cannot convert ${x} to radians, as it is does not look like degrees`)
  },

  /*
    Generator functions, i.e? SPARQL expression whose evaluation generates several RDF Terms
  */

  // Split a RDF Term as a string using a separator
  'https://callidon.github.io/sparql-engine/functions#strsplit': function (term: Term, separator: Term): Iterable<Term> {
    return function * () {
      for (let token of term.value.split(separator.value)) {
        yield rdf.createLiteral(token)
      }
      return
    }()
  }
}
