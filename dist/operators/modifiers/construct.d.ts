import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import { Bindings } from '../../rdf/bindings';
/**
 * A ConstructOperator transform solution mappings into RDF triples, according to a template
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct}
 * @param source  - Source observable
 * @param templates - Set of triples patterns in the CONSTRUCT clause
 * @author Thomas Minier
 */
export default function construct(source: Observable<Bindings>, query: any): Observable<Algebra.TripleObject>;
