/* file: symbols.ts
MIT License

Copyright (c) 2019-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

export default {
  /** The set of prefixes of a SPARQL query, as extracted by sparql.js */
  'PREFIXES': Symbol('SPARQL_ENGINE_QUERY_PREFIXES'),
  /** Identify a SPARQL query with a LIMIT modifier and/or an OFFSET modifier */
  'HAS_LIMIT_OFFSET': Symbol('SPARQL_ENGINE_QUERY_HAS_LIMIT_OFFSET'),
  /** The default buffer size used in the bound join algorithm */
  'BOUND_JOIN_BUFFER_SIZE': Symbol('SPARQL_ENGINE_INTERNALS_BOUND_JOIN_BUFFER_SIZE'),
  /** Forces all joins to be done using the Index Join algorithm */
  'FORCE_INDEX_JOIN': Symbol('SPARQL_ENGINE_FORCE_INDEX_JOIN')
}
