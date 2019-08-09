import { Observable } from 'rxjs';
import { Bindings } from '../../rdf/bindings';
/**
 * Perform a Symmetric Hash Join between two sources
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  left - Left source
 * @param  right - Right source
 * @return An Observable that performs a symmetric hash join between the sources
 */
export default function symHashJoin(joinKey: string, left: Observable<Bindings>, right: Observable<Bindings>): Observable<Bindings>;
