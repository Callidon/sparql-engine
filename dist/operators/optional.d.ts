import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import PlanBuilder from '../engine/plan-builder';
import { Bindings } from '../rdf/bindings';
import ExecutionContext from '../engine/context/execution-context';
/**
 * Handles an SPARQL OPTIONAL clause in the following way:
 * 1) Buffer every bindings produced by the source iterator.
 * 2) Set a flag to False if the OPTIONAL clause yield at least one set of bindings.
 * 3) When the OPTIONAL clause if evaluated, check if the flag is True.
 * 4) If the flag is True, then we output all buffered values. Otherwise, we do nothing.
 * @see {@link https://www.w3.org/TR/sparql11-query/#optionals}
 * @author Thomas Minier
 */
export default function optional(source: Observable<Bindings>, patterns: Algebra.PlanNode[], builder: PlanBuilder, context: ExecutionContext): Observable<Bindings>;
