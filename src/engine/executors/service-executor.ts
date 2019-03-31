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

import Executor from './executor'
import { Algebra } from 'sparqljs'
import { Observable, merge, from } from 'rxjs'
import { map, shareReplay, mergeMap } from 'rxjs/operators'
import { rdf } from '../../utils'
import { Bindings } from '../../rdf/bindings'
import ExecutionContext from '../context/execution-context'

/**
 * A ServiceExecutor is responsible for evaluation a SERVICE clause in a SPARQL query.
 * @abstract
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default abstract class ServiceExecutor extends Executor {
  /**
   * Build an iterator to evaluate a SERVICE clause
   * @param  source  - Source iterator
   * @param  node    - Service clause
   * @param  options - Execution options
   * @return An iterator used to evaluate a SERVICE clause
   */
  /*
  buildIterator (source: Observable<Bindings>, node: Algebra.ServiceNode, context: ExecutionContext): Observable<Bindings> {
    let subquery: Algebra.RootNode
    if (node.patterns[0].type === 'query') {
      subquery = (<Algebra.RootNode> node.patterns[0])
    } else {
      subquery = {
        prefixes: context.getProperty('prefixes'),
        queryType: 'SELECT',
        variables: ['*'],
        type: 'query',
        where: node.patterns
      }
    }
    return this._execute(source, node.name, subquery, context)
  }*/

  buildIterator (source: Observable<Bindings>, node: Algebra.GraphNode, context: ExecutionContext): Observable<Bindings> {

    let subquery: Algebra.RootNode
    if (node.patterns[0].type === 'query') {
      subquery = (<Algebra.RootNode> node.patterns[0])
    } else {
      subquery = {
        prefixes: context.getProperty('prefixes'),
        queryType: 'SELECT',
        variables: ['*'],
        type: 'query',
        where: node.patterns
      }
    }

    //if the node is a variable, check to see if it's either a bound variable or a named graph
    if(rdf.isVariable(node.name)){
      // clone the source first
      source = source.pipe(shareReplay(5))
      return source.pipe(mergeMap(bindings => {
        //check for bound variable
        const eachBinding = from([bindings])
        const variableIRI = bindings.get(node.name)
        if(variableIRI){
          return this._execute(eachBinding, variableIRI, subquery, context)
        }
        return eachBinding
      }))

    }
  
    // otherwise, execute the subquery using the Graph
    return this._execute(source, node.name, subquery, context)
  }

  /**
   * Returns an iterator used to evaluate a SERVICE clause
   * @abstract
   * @param source    - Source iterator
   * @param iri       - Iri of the SERVICE clause
   * @param subquery  - Subquery to be evaluated
   * @param options   - Execution options
   * @return An iterator used to evaluate a SERVICE clause
   */
  abstract _execute (source: Observable<Bindings>, iri: string, subquery: Algebra.RootNode, context: ExecutionContext): Observable<Bindings>
}
