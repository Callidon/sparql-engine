import { Algebra } from 'sparqljs';
import { Bindings } from '../rdf/bindings';
import { CustomFunctions } from "../engine/plan-builder";
/**
 * Evaluate SPARQL Filter clauses
 * @see {@link https://www.w3.org/TR/sparql11-query/#expressions}
 * @author Thomas Minier
 * @param expression - FILTER expression
 * @return A Filter operator
 */
export default function sparqlFilter(expression: Algebra.Expression, customFunctions?: CustomFunctions): import("rxjs").MonoTypeOperatorFunction<Bindings>;
