import Executor from './executor';
import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import Dataset from '../../rdf/dataset';
import { Bindings } from '../../rdf/bindings';
import ExecutionContext from '../context/execution-context';
/**
 * A GraphExecutor is responsible for evaluation a GRAPH clause in a SPARQL query.
 * @author Thomas Minier
 */
export default class GraphExecutor extends Executor {
    private readonly _dataset;
    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    constructor(dataset: Dataset);
    /**
     * Build an iterator to evaluate a GRAPH clause
     * @param  source  - Source iterator
     * @param  node    - Graph clause
     * @param  options - Execution options
     * @return An iterator used to evaluate a GRAPH clause
     */
    buildIterator(source: Observable<Bindings>, node: Algebra.GraphNode, context: ExecutionContext): Observable<Bindings>;
    /**
     * Returns an iterator used to evaluate a GRAPH clause
     * @param  source    - Source iterator
     * @param  iri       - IRI of the GRAPH clause
     * @param  subquery  - Subquery to be evaluated
     * @param  options   - Execution options
     * @return An iterator used to evaluate a GRAPH clause
     */
    _execute(source: Observable<Bindings>, iri: string, subquery: Algebra.RootNode, context: ExecutionContext): Observable<Bindings>;
}
