/* file : ask.ts
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
import { first, map, defaultIfEmpty } from 'rxjs/operators'
import { Bindings, BindingBase } from '../../rdf/bindings'

/**
 * A AskOperator output True if a source iterator has solutions, false otherwise.
 * results are outputed following the SPARQL XML results format
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#ask}
 * @author Thomas Minier
 * @param source - Source observable
 */
export default function ask (source: Observable<Bindings>) {
  const defaultValue: Bindings = new BindingBase()
  return source
    .pipe(defaultIfEmpty(defaultValue))
    .pipe(first())
    .pipe(map((b: Bindings) => {
      return b.size > 0
    }))
}
