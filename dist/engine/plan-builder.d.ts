import { Algebra } from 'sparqljs';
import { Observable } from 'rxjs';
import { Consumable } from '../operators/update/consumer';
import { terms } from '../rdf-terms';
import { Bindings } from '../rdf/bindings';
import Dataset from '../rdf/dataset';
import AggregateExecutor from './executors/aggregate-executor';
import BGPExecutor from './executors/bgp-executor';
import PathExecutor from './executors/path-executor';
import GraphExecutor from './executors/graph-executor';
import UpdateExecutor from './executors/update-executor';
import ServiceExecutor from './executors/service-executor';
import ExecutionContext from './context/execution-context';
/**
 * Output of a physical query execution plan
 */
export declare type QueryOutput = Bindings | Algebra.TripleObject | boolean;
/**
 * Type alias to describe the shape of custom functions. It's basically a JSON object from an IRI (in string form) to a function of 0 to many RDFTerms that produces an RDFTerm.
 */
export declare type CustomFunctions = {
    [key: string]: (...args: (terms.RDFTerm | terms.RDFTerm[] | null)[]) => terms.RDFTerm;
};
/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class PlanBuilder {
    private readonly _dataset;
    private readonly _parser;
    private _bgpExecutor;
    private _pathExecutor;
    private _aggExecutor;
    private _graphExecutor;
    private _updateExecutor;
    private _serviceExecutor;
    private _customFunctions?;
    /**
     * Constructor
     * @param dataset - RDF Dataset used for query execution
     * @param prefixes - Optional prefixes to use during query processing
     */
    constructor(dataset: Dataset, prefixes?: any, customFunctions?: CustomFunctions);
    /**
     * Set the BGP executor used to evaluate Basic Graph patterns
     * @param executor - Executor used to evaluate Basic Graph patterns
     */
    bgpExecutor: BGPExecutor;
    /**
     * Set the BGP executor used to evaluate Basic Graph patterns
     * @param executor - Executor used to evaluate Basic Graph patterns
     */
    pathExecutor: PathExecutor;
    /**
     * Set the BGP executor used to evaluate SPARQL Aggregates
     * @param executor - Executor used to evaluate SPARQL Aggregates
     */
    aggregateExecutor: AggregateExecutor;
    /**
     * Set the BGP executor used to evaluate SPARQL GRAPH clauses
     * @param executor - Executor used to evaluate SPARQL GRAPH clauses
     */
    graphExecutor: GraphExecutor;
    /**
     * Set the BGP executor used to evaluate SPARQL UPDATE queries
     * @param executor - Executor used to evaluate SPARQL UPDATE queries
     */
    updateExecutor: UpdateExecutor;
    /**
     * Set the executor used to evaluate SERVICE clauses
     * @param executor - Executor used to evaluate SERVICE clauses
     */
    serviceExecutor: ServiceExecutor;
    /**
     * Build the physical query execution of a SPARQL 1.1 query
     * and returns an iterator that can be consumed to evaluate the query.
     * @param  query        - SPARQL query to evaluated
     * @param  options  - Execution options
     * @return An iterator that can be consumed to evaluate the query.
     */
    build(query: any, context?: ExecutionContext): Observable<QueryOutput> | Consumable;
    /**
     * Build the physical query execution of a SPARQL query
     * @param  query         - Parsed SPARQL query
     * @param  options  - Execution options
     * @param  source - Source iterator
     * @return An iterator that can be consumed to evaluate the query.
     */
    _buildQueryPlan(query: Algebra.RootNode, context: ExecutionContext, source?: Observable<Bindings>): Observable<Bindings>;
    /**
     * Optimize a WHERE clause and build the corresponding physical plan
     * @param  source  - Source iterator
     * @param  groups   - WHERE clause to process
     * @param  options  - Execution options
     * @return An iterator used to evaluate the WHERE clause
     */
    _buildWhere(source: Observable<Bindings>, groups: Algebra.PlanNode[], context: ExecutionContext): Observable<Bindings>;
    /**
     * Build a physical plan for a SPARQL group clause
     * @param  source  - Source iterator
     * @param  group   - SPARQL Group
     * @param  options - Execution options
     * @return An iterator used to evaluate the SPARQL Group
     */
    _buildGroup(source: Observable<Bindings>, group: Algebra.PlanNode, context: ExecutionContext): Observable<Bindings>;
    /**
     * Build an iterator which evaluates a SPARQL query with VALUES clause(s).
     * It rely on a query rewritiing approach:
     * ?s ?p ?o . VALUES ?s { :1 :2 } becomes {:1 ?p ?o BIND(:1 AS ?s)} UNION {:2 ?p ?o BIND(:2 AS ?s)}
     * @param source  - Source iterator
     * @param groups  - Query body, i.e., WHERE clause
     * @param options - Execution options
     * @return An iterator which evaluates a SPARQL query with VALUES clause(s)
     */
    _buildValues(source: Observable<Bindings>, groups: Algebra.PlanNode[], context: ExecutionContext): Observable<Bindings>;
}
