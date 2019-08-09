import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import { Bindings } from '../rdf/bindings';
/**
 * A OrderByOperator implements a ORDER BY clause, i.e.,
 * it sorts solution mappings produced by another operator
 * @extends MaterializeOperator
 * @author Thomas Minier
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modOrderBy}
 */
export default function orderby(source: Observable<Bindings>, comparators: Algebra.OrderComparator[]): Observable<Bindings>;
