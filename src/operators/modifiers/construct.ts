/* file : construct.ts
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
import { flatMap, endWith } from 'rxjs/operators'
import { Algebra } from 'sparqljs'
import { compact } from 'lodash'
import { rdf } from '../../utils'
import { Bindings } from '../../rdf/bindings'

/**
 * A ConstructOperator transform solution mappings into RDF triples, according to a template
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct}
 * @param source  - Source observable
 * @param templates - Set of triples patterns in the CONSTRUCT clause
 * @author Thomas Minier
 */
export default function construct (source: Observable<Bindings>, query: any) {
  const rawTriples: Algebra.TripleObject[] = []
  const templates: Algebra.TripleObject[] = query.template!.filter((t: any) => {
    if (rdf.isVariable(t.subject) || rdf.isVariable(t.predicate) || rdf.isVariable(t.object)) {
      return true
    }
    rawTriples.push(t)
    return false
  })
  return source
    .pipe(flatMap((bindings: Bindings) => {
      return compact(templates.map(t => bindings.bound(t)))
    }))
    .pipe(endWith(...rawTriples))
}
// export default class ConstructOperator extends MultiTransformIterator<Bindings, Algebra.TripleObject> {
//   private readonly _templates: Algebra.TripleObject[]
//   /**
//    * Constructor
//    * @param source  - Source iterator
//    * @param templates - Set of triples patterns in the CONSTRUCT clause
//    */
//   constructor (source: AsyncIterator<Bindings>, query: any) {
//     super(source)
//     // filter out triples with no SPARQL variables to output them only once
//     this._templates = query.template!.filter((t: any) => {
//       if (rdf.isVariable(t.subject) || rdf.isVariable(t.predicate) || rdf.isVariable(t.object)) {
//         return true
//       }
//       this._push(t)
//       return false
//     })
//     source.on('error', err => this.emit('error', err))
//   }
//
//   _createTransformer (bindings: Bindings): AsyncIterator<Algebra.TripleObject> {
//     return new ArrayIterator(compact(this._templates.map(t => bindings.bound(t))))
//   }
// }
