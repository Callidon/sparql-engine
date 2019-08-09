import Executor from './executor';
import { Algebra } from 'sparqljs';
import { Observable } from 'rxjs';
import { Bindings } from '../../rdf/bindings';
import ExecutionContext from '../context/execution-context';
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
    buildIterator(source: Observable<Bindings>, node: Algebra.GraphNode, context: ExecutionContext): Observable<Bindings>;
    /**
     * Returns an iterator used to evaluate a SERVICE clause
     * @abstract
     * @param source    - Source iterator
     * @param iri       - Iri of the SERVICE clause
     * @param subquery  - Subquery to be evaluated
     * @param options   - Execution options
     * @return An iterator used to evaluate a SERVICE clause
     */
    abstract _execute(source: Observable<Bindings>, iri: string, subquery: Algebra.RootNode, context: ExecutionContext): Observable<Bindings>;
}
