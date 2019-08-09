import { Observable } from 'rxjs';
import Graph from '../../rdf/graph';
import { Bindings } from '../../rdf/bindings';
import { Algebra } from 'sparqljs';
import ExecutionContext from '../../engine/context/execution-context';
export declare type BGPBucket = Algebra.TripleObject[][];
export declare type RewritingTable = Map<number, Bindings>;
/**
 * Performs a Bound Join
 * see https://link.springer.com/content/pdf/10.1007/978-3-642-25073-6_38.pdf for more details
 * @author Thomas Minier
 * @param  source - Source of bindings
 * @param  bgp - Basic Pattern to join with
 * @param  graph - Graphe queried
 * @param  options - Query execution options
 * @return An observable which evaluates the bound join
 */
export default function boundJoin(source: Observable<Bindings>, bgp: Algebra.TripleObject[], graph: Graph, context: ExecutionContext): Observable<Bindings>;
