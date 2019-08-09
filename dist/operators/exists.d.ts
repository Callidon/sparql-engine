import { Observable } from 'rxjs';
import { Bindings } from '../rdf/bindings';
import PlanBuilder from '../engine/plan-builder';
import ExecutionContext from '../engine/context/execution-context';
/**
 * Evaluates a SPARQL FILTER (NOT) EXISTS clause
 * @param source - Source observable
 * @param groups    - Content of the FILTER clause
 * @param builder   - Plan builder used to evaluate subqueries
 * @param notexists - True if the filter is NOT EXISTS, False otherwise
 * @param options   - Execution options
 * @author Thomas Minier
 * TODO this function could be simplified using a filterMap like operator, we should check if Rxjs offers that filterMap
 */
export default function exists(source: Observable<Bindings>, groups: any[], builder: PlanBuilder, notexists: boolean, context: ExecutionContext): Observable<Bindings>;
