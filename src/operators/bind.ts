/* file : bind.ts
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

import { Pipeline } from '../engine/pipeline/pipeline'
import { PipelineStage } from '../engine/pipeline/pipeline-engine'
import { Algebra } from 'sparqljs'
import { Bindings } from '../rdf/bindings'
import { SPARQLExpression, CustomFunctions } from './expressions/sparql-expression'
import { rdf } from '../utils'
import { Term } from 'rdf-js'
import { isArray } from 'lodash'

/**
 * Test if an object is an iterator that yields RDF Terms or null values
 * @param obj - Input object
 * @return True if the input obkect is an iterator, False otherwise
 */
function isIterable (obj: Object): obj is Iterable<Term | null> {
  return typeof obj[Symbol.iterator] === 'function'
}

/**
 * Apply a SPARQL BIND clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#bind}
 * @author Thomas Minier
 * @author Corentin Marionneau
 * @param source - Source {@link PipelineStage}
 * @param variable  - SPARQL variable used to bind results
 * @param expression - SPARQL expression
 * @return A {@link PipelineStage} which evaluate the BIND operation
 */
export default function bind (source: PipelineStage<Bindings>, variable: string, expression: Algebra.Expression | string, customFunctions?: CustomFunctions): PipelineStage<Bindings> {
  const expr = new SPARQLExpression(expression, customFunctions)
  return Pipeline.getInstance().mergeMap(source, bindings => {
    try {
      const value = expr.evaluate(bindings)
      if (value !== null && (isArray(value) || isIterable(value))) {
        // build a source of bindings from the array/iterable produced by the expression's evaluation
        return Pipeline.getInstance().fromAsync(input => {
          try {
            for (let term of value) {
              const mu = bindings.clone()
              if (term === null) {
                mu.set(variable, rdf.toN3(rdf.createUnbound()))
              } else {
                mu.set(variable, rdf.toN3(term))
              }
              input.next(mu)
            }
          } catch (e) {
            input.error(e)
          }
          input.complete()
        })
      } else {
        // simple case: bound the value to the given variable in the set of bindings
        const res = bindings.clone()
        // null values indicates that an error occurs during the expression's evaluation
        // in this case, the variable is bind to a special UNBOUND value
        if (value === null) {
          res.set(variable, rdf.toN3(rdf.createUnbound()))
        } else {
          res.set(variable, rdf.toN3(value))
        }
        return Pipeline.getInstance().of(res)
      }
    } catch (e) {
      // silence errors
    }
    return Pipeline.getInstance().empty()
  })
}
