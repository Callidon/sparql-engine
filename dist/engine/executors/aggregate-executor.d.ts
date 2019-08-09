import { Observable } from 'rxjs';
import Executor from './executor';
import { CustomFunctions } from '../../engine/plan-builder';
import { Algebra } from 'sparqljs';
import { Bindings } from '../../rdf/bindings';
import ExecutionContext from '../context/execution-context';
/**
 * An AggregateExecutor handles the evaluation of Aggregations operations,
 * GROUP BY and HAVING clauses in SPARQL queries.
 * @see https://www.w3.org/TR/sparql11-query/#aggregates
 * @author Thomas Minier
 */
export default class AggregateExecutor extends Executor {
    /**
     * Build an iterator for the evaluation of SPARQL aggregations
     * @param source  - Source iterator
     * @param query   - Parsed SPARQL query (logical execution plan)
     * @param options - Execution options
     * @return An iterator which evaluate SPARQL aggregations
     */
    buildIterator(source: Observable<Bindings>, query: Algebra.RootNode, context: ExecutionContext, customFunctions?: CustomFunctions): Observable<Bindings>;
    /**
     * Build an iterator for the evaluation of a GROUP BY clause
     * @param source  - Source iterator
     * @param  groupby - GROUP BY clause
     * @param  options - Execution options
     * @return An iterator which evaluate a GROUP BY clause
     */
    _executeGroupBy(source: Observable<Bindings>, groupby: Algebra.Aggregation[], context: ExecutionContext, customFunctions?: CustomFunctions): Observable<Bindings>;
    /**
     * Build an iterator for the evaluation of a HAVING clause
     * @param  source  - Source iterator
     * @param  having  - HAVING clause
     * @param  options - Execution options
     * @return An iterator which evaluate a HAVING clause
     */
    _executeHaving(source: Observable<Bindings>, having: Algebra.Expression[], context: ExecutionContext, customFunctions?: CustomFunctions): Observable<Bindings>;
}
