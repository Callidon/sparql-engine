import { Observable } from 'rxjs';
import { Bindings } from '../../rdf/bindings';
/**
 * A AskOperator output True if a source iterator has solutions, false otherwise.
 * results are outputed following the SPARQL XML results format
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#ask}
 * @author Thomas Minier
 * @param source - Source observable
 */
export default function ask(source: Observable<Bindings>): Observable<boolean>;
