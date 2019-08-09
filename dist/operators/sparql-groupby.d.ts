import { Observable } from 'rxjs';
import { Bindings } from '../rdf/bindings';
/**
 * Apply a SPARQL GROUP BY clause
 * @see https://www.w3.org/TR/sparql11-query/#groupby
 * @extends MaterializeOperator
 * @author Thomas Minier
 */
export default function sparqlGroupBy(source: Observable<Bindings>, variables: string[]): Observable<any>;
