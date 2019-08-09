import { Consumable } from './consumer';
import Graph from '../../rdf/graph';
/**
 * Clear all RDF triples in a RDF Graph
 * @author Thomas Minier
 */
export default class ClearConsumer implements Consumable {
    private readonly _graph;
    /**
     * Consuctor
     * @param graph - Input RDF Graph
     */
    constructor(graph: Graph);
    execute(): Promise<void>;
}
