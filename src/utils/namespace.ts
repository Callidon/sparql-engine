/* file : utils.ts
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

import namespace from '@rdfjs/namespace'

/**
 * RDF namespaces
 */

/**
 * Create an IRI under the XSD namespace
 * (<http://www.w3.org/2001/XMLSchema#>)
 * @param suffix - Suffix appended to the XSD namespace to create an IRI
 * @return An new IRI, under the XSD namespac
 */
export const XSD = namespace('http://www.w3.org/2001/XMLSchema#')

/**
 * Create an IRI under the RDF namespace
 * (<http://www.w3.org/1999/02/22-rdf-syntax-ns#>)
 * @param suffix - Suffix appended to the RDF namespace to create an IRI
 * @return An new IRI, under the RDF namespac
 */
export const RDF = namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')

/**
 * Create an IRI under the SEF namespace
 * (<https://callidon.github.io/sparql-engine/functions#>)
 * @param suffix - Suffix appended to the SES namespace to create an IRI
 * @return An new IRI, under the SES namespac
 */
export const SEF = namespace(
  'https://callidon.github.io/sparql-engine/functions#',
)

/**
 * Create an IRI under the SES namespace
 * (<https://callidon.github.io/sparql-engine/search#>)
 * @param suffix - Suffix appended to the SES namespace to create an IRI
 * @return An new IRI, under the SES namespac
 */
export const SES = namespace('https://callidon.github.io/sparql-engine/search#')
