import Executor from './executor';
import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import Graph from '../../rdf/graph';
import Dataset from '../../rdf/dataset';
import { Bindings } from '../../rdf/bindings';
import ExecutionContext from '../context/execution-context';
/**
 * A BGPExecutor is responsible for evaluation BGP in a SPARQL query.
 * Users can extend this class and overrides the "_execute" method to customize BGP evaluation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class BGPExecutor extends Executor {
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
     * Build an iterator to evaluate a BGP
     * @param  source    - Source iterator
     * @param  patterns  - Set of triple patterns
     * @param  options   - Execution options
     * @return An iterator used to evaluate a Basic Graph pattern
     */
    buildIterator(source: Observable<Bindings>, patterns: Algebra.TripleObject[], context: ExecutionContext): Observable<Bindings>;
    /**
     * Replace the blank nodes in a BGP by SPARQL variables
     * @param patterns - BGP to rewrite, i.e., a set of triple patterns
     * @return A Tuple [Rewritten BGP, List of SPARQL variable added]
     */
    _replaceBlankNodes(patterns: Algebra.TripleObject[]): [Algebra.TripleObject[], string[]];
    /**
     * Returns an iterator used to evaluate a Basic Graph pattern
     * @param  source         - Source iterator
     * @param  graph          - The graph on which the BGP should be executed
     * @param  patterns       - Set of triple patterns
     * @param  options        - Execution options
     * @param  isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
     * @return An iterator used to evaluate a Basic Graph pattern
     */
    _execute(source: Observable<Bindings>, graph: Graph, patterns: Algebra.TripleObject[], context: ExecutionContext): Observable<Bindings>;
}
