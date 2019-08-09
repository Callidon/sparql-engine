import Executor from './executor';
import { Observable } from 'rxjs';
import { Consumable } from '../../operators/update/consumer';
import InsertConsumer from '../../operators/update/insert-consumer';
import DeleteConsumer from '../../operators/update/delete-consumer';
import ClearConsumer from '../../operators/update/clear-consumer';
import Graph from '../../rdf/graph';
import Dataset from '../../rdf/dataset';
import { Algebra } from 'sparqljs';
import { Bindings } from '../../rdf/bindings';
import ExecutionContext from '../context/execution-context';
/**
 * An UpdateExecutor is an executor responsible for evaluating SPARQL UPDATE queries.
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321
 * @author Thomas Minier
 */
export default class UpdateExecutor extends Executor {
    private readonly _dataset;
    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    constructor(dataset: Dataset);
    /**
     * Create a {@link Consumable} used to evaluate a SPARQL 1.1 Update query
     * @param updates - Set of Update queries to execute
     * @param options - Execution options
     * @return A Consumable used to evaluatethe set of update queries
     */
    execute(updates: Array<Algebra.UpdateQueryNode | Algebra.UpdateClearNode | Algebra.UpdateCopyMoveNode>, context: ExecutionContext): Consumable;
    /**
     * Build a Consumer to evaluate SPARQL UPDATE queries
     * @private
     * @param update  - Parsed query
     * @param options - Execution options
     * @return A Consumer used to evaluate SPARQL UPDATE queries
     */
    _handleInsertDelete(update: Algebra.UpdateQueryNode, context: ExecutionContext): Consumable;
    /**
     * Build a consumer to evaluate a SPARQL INSERT clause
     * @private
     * @param source - Source iterator
     * @param group - parsed SPARQL INSERT clause
     * @param graph - RDF Graph used to insert data
     * @return A consumer used to evaluate a SPARQL INSERT clause
     */
    _buildInsertConsumer(source: Observable<Bindings>, group: Algebra.BGPNode | Algebra.UpdateGraphNode, graph: Graph | null, context: ExecutionContext): InsertConsumer;
    /**
     * Build a consumer to evaluate a SPARQL DELETE clause
     * @private
     * @param  source - Source iterator
     * @param  group - parsed SPARQL DELETE clause
     * @param  graph - RDF Graph used to delete data
     * @return A consumer used to evaluate a SPARQL DELETE clause
     */
    _buildDeleteConsumer(source: Observable<Bindings>, group: Algebra.BGPNode | Algebra.UpdateGraphNode, graph: Graph | null, context: ExecutionContext): DeleteConsumer;
    /**
     * Build a Consumer to evaluate CLEAR queries
     * @private
     * @param query - Parsed query
     * @return A Consumer used to evaluate CLEAR queries
     */
    _handleClearQuery(query: Algebra.UpdateClearNode): ClearConsumer;
}
