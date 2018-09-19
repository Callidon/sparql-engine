/* file : service-executor.ts
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

import { Algebra } from 'sparqljs'
import { AsyncIterator } from 'asynciterator'
import { Bindings } from '../../rdf/bindings'

/**
 * A ServiceExecutor is responsible for evaluation a SERVICE clause in a SPARQL query.
 * @abstract
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default abstract class ServiceExecutor {
  readonly _builder: any
  /**
   * Constructor
   * @param {PlanBuilder} builder - PlanBuilder instance
   */
  constructor (builder: any) {
    this._builder = builder
  }

  /**
   * Get the PlanBuilder registered by the executor
   * @return {PlanBuilder} The PlanBuilder registered by the executor
   */
  get builder (): any {
    return this._builder
  }

  /**
   * Build an iterator to evaluate a SERVICE clause
   * @private
   * @param  {AsyncIterator}  source  - Source iterator
   * @param  {Object}         node    - Service clause
   * @param  {Object}         options - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a SERVICE clause
   */
  buildIterator (source: AsyncIterator<Bindings>, node: Algebra.ServiceNode, options: any): AsyncIterator<Bindings> {
    let subquery: Algebra.RootNode
    if (node.patterns[0].type === 'query') {
      subquery = (<Algebra.RootNode> node.patterns[0])
    } else {
      subquery = {
        prefixes: options.prefixes,
        queryType: 'SELECT',
        variables: ['*'],
        type: 'query',
        where: node.patterns
      }
    }
    return this._execute(source, node.name, subquery, options)
  }

  /**
   * Returns an iterator used to evaluate a SERVICE clause
   * @param  {AsyncIterator}  source    - Source iterator
   * @param  {string}         iri       - Iri of the SERVICE clause
   * @param  {Object}         subquery  - Subquery to be evaluated
   * @param  {Object}         options   - Execution options
   * @return {AsyncIterator} An iterator used to evaluate a SERVICE clause
   */
  abstract _execute (source: AsyncIterator<Bindings>, iri: string, subquery: Algebra.RootNode, options: Object): AsyncIterator<Bindings>
}