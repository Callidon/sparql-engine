import Executor from './executor';
import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import { Bindings } from '../../rdf/bindings';
import Dataset from '../../rdf/dataset';
import Graph from '../../rdf/graph';
import ExecutionContext from '../context/execution-context';
/**
 * The base class to implements in order to evaluate Property Paths.
 * A subclass of this class only has to implement the `_execute` method to provide an execution logic for property paths.
 * @abstract
 * @author Thomas Minier
 */
export default abstract class PathExecutor extends Executor {
    readonly _dataset: Dataset;
    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    constructor(dataset: Dataset);
    /**
     * Return the RDF Graph to be used for BGP evaluation.
     * * If `iris` is empty, returns the default graph
     * * If `iris` has a single entry, returns the corresponding named graph
     * * Otherwise, returns an UnionGraph based on the provided iris
     * @param  iris - List of Graph's iris
     * @return An RDF Graph
     */
    _getGraph(iris: string[]): Graph;
    /**
     * Get an observable for evaluating a succession of property paths, connected by joins.
     * @param  triples - Triple patterns
     * @param  context - Execution context
     * @return An Observable which yield set of bindings from the pipeline of joins
     */
    executeManyPaths(source: Observable<Bindings>, triples: Algebra.PathTripleObject[], context: ExecutionContext): Observable<Bindings>;
    /**
     * Get an observable for evaluating the property path.
     * @param  subject - Path subject
     * @param  path  - Property path
     * @param  obj   - Path object
     * @param  context - Execution context
     * @return An Observable which yield set of bindings
     */
    buildIterator(subject: string, path: Algebra.PropertyPath, obj: string, context: ExecutionContext): Observable<Bindings>;
    /**
     * Execute a property path against a RDF Graph.
     * @param  subject - Path subject
     * @param  path  - Property path
     * @param  obj   - Path object
     * @param  graph - RDF graph
     * @param  context - Execution context
     * @return An Observable which yield RDF triples matching the property path
     */
    abstract _execute(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): Observable<Algebra.TripleObject>;
}
