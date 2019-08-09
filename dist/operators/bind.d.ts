import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import { Bindings } from '../rdf/bindings';
import { CustomFunctions } from '../engine/plan-builder';
/**
 * Apply a SPARQL BIND clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#bind}
 * @author Thomas Minier
 * @author Corentin Marionneau
 * @param variable  - SPARQL variable used to bind results
 * @param expression - SPARQL expression
 * @return A Bind operator
 */
export default function bind(variable: string, expression: Algebra.Expression | string, customFunctions?: CustomFunctions): (source: Observable<Bindings>) => Observable<Bindings>;
