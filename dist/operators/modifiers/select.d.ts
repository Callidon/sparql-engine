import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import { Bindings } from '../../rdf/bindings';
/**
 * Evaluates a SPARQL SELECT operation, i.e., perform a selection over sets of solutions bindings
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#select}
 * @param query - SELECT query
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default function select(source: Observable<Bindings>, query: Algebra.RootNode): Observable<Bindings>;
