import { Observable } from 'rxjs';
import { Bindings } from '../rdf/bindings';
/**
 * Evaluates a SPARQL MINUS clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#neg-minus}
 * @extends TransformIterator
 * @author Thomas Minier
 */
export default function minus(source: Observable<Bindings>, rightSource: Observable<Bindings>): Observable<Bindings>;
