/* file : bind.ts
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

import { Observable } from 'rxjs'
import SPARQLExpression from './expressions/sparql-expression'
import { Algebra } from 'sparqljs'
import { Bindings } from '../rdf/bindings'
import { CustomFunctions } from '../engine/plan-builder'

/**
 * Apply a SPARQL BIND clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#bind}
 * @author Thomas Minier
 * @author Corentin Marionneau
 * @param variable  - SPARQL variable used to bind results
 * @param expression - SPARQL expression
 * @return A Bind operator
 */
export default function bind (variable: string, expression: Algebra.Expression | string, customFunctions?: CustomFunctions) {
  return function (source: Observable<Bindings>) {
    const expr = new SPARQLExpression(expression, customFunctions)
    return new Observable<Bindings>(subscriber => {
      return source.subscribe((bindings: Bindings) => {
        const res = bindings.clone()
        try {
          const value: any = expr.evaluate(bindings)
          if (value !== null) {
            res.set(variable, value.asRDF)
          }
        } catch (e) {
          subscriber.error(e)
        }
        subscriber.next(res)
      },
      err => subscriber.error(err),
      () => subscriber.complete())
    })
  }
}
