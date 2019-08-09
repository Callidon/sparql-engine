import { Observable } from 'rxjs';
import { Bindings } from '../../rdf/bindings';
/**
 * Perform a traditional Hash join between two sources, i.e., materialize the right source in a hash table and then read from the left source while probing into the hash table.
 * @param  left - Left source
 * @param  right - Right source
 * @param  joinKey - SPARQL variable used as join attribute
 * @return An Observable which performs a Hash join
 */
export default function hashJoin(left: Observable<Bindings>, right: Observable<Bindings>, joinKey: string): Observable<Bindings>;
