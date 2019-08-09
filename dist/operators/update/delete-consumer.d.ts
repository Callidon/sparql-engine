import { Consumer } from './consumer';
import Graph from '../../rdf/graph';
import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
/**
 * A DeleteConsumer evaluates a SPARQL DELETE clause
 * @extends Consumer
 * @author Thomas Minier
 */
export default class DeleteConsumer extends Consumer {
    private readonly _graph;
    /**
     * Constructor
     * @param source - Source iterator
     * @param graph - Input RDF Graph
     * @param options - Execution options
     */
    constructor(source: Observable<Algebra.TripleObject>, graph: Graph, options: Object);
    _write(triple: Algebra.TripleObject, encoding: string | undefined, done: (err?: Error) => void): void;
}
