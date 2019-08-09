import { Consumer } from './consumer';
import Graph from '../../rdf/graph';
import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
/**
 * An InsertConsumer evaluates a SPARQL INSERT clause
 * @extends Consumer
 * @author Thomas Minier
 */
export default class InsertConsumer extends Consumer {
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
