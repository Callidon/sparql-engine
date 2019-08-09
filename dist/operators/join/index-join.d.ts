import Graph from '../../rdf/graph';
import { Bindings } from '../../rdf/bindings';
import { Algebra } from 'sparqljs';
import ExecutionContext from '../../engine/context/execution-context';
/**
 * Perform a join between a source of solution bindings (left relation)
 * and a triple pattern (right relation) using the Index Nested Loop Join algorithm.
 * This algorithm is more efficient if the cardinality of the left relation is smaller
 * than the cardinality of the right one.
 * @param pattern - Triple pattern to join with (right relation)
 * @param graph   - RDF Graph on which the join is performed
 * @param options - Execution options
 * @author Thomas Minier
 */
export default function indexJoin(pattern: Algebra.TripleObject, graph: Graph, context: ExecutionContext): import("rxjs").OperatorFunction<Bindings, Bindings>;
