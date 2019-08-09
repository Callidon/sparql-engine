import { ObservableInput } from 'rxjs';
import { Algebra } from 'sparqljs';
import { Bindings } from './bindings';
import { GRAPH_CAPABILITY } from './graph_capability';
import ExecutionContext from '../engine/context/execution-context';
/**
 * Metadata used for query optimization
 */
export interface PatternMetadata {
    triple: Algebra.TripleObject;
    cardinality: number;
    nbVars: number;
}
/**
 * An abstract RDF Graph, accessed through a RDF Dataset
 * @abstract
 * @author Thomas Minier
 */
export default abstract class Graph {
    private _iri;
    private _capabilities;
    constructor();
    /**
     * Get the IRI of the Graph
     * @return The IRI of the Graph
     */
    /**
    * Set the IRI of the Graph
    * @param value - The new IRI of the Graph
    */
    iri: string;
    /**
     * Test if a graph has a capability
     * @param  token - Capability tested
     * @return True if the graph has the reuqested capability, false otherwise
     */
    _isCapable(token: GRAPH_CAPABILITY): boolean;
    /**
     * Insert a RDF triple into the RDF Graph
     * @param  triple - RDF Triple to insert
     * @return A Promise fulfilled when the insertion has been completed
     */
    abstract insert(triple: Algebra.TripleObject): Promise<void>;
    /**
     * Delete a RDF triple from the RDF Graph
     * @param  triple - RDF Triple to delete
     * @return A Promise fulfilled when the deletion has been completed
     */
    abstract delete(triple: Algebra.TripleObject): Promise<void>;
    /**
     * Returns an iterator that finds RDF triples matching a triple pattern in the graph.
     * @param  triple - Triple pattern to find
     * @return An iterator which finds RDF triples matching a triple pattern
     */
    abstract find(triple: Algebra.TripleObject, context: ExecutionContext): ObservableInput<Algebra.TripleObject>;
    /**
     * Remove all RDF triples in the Graph
     * @return A Promise fulfilled when the clear operation has been completed
     */
    abstract clear(): Promise<void>;
    /**
     * Estimate the cardinality of a Triple pattern, i.e., the number of matching RDF Triples in the RDF Graph.
     * @param  triple - Triple pattern to estimate cardinality
     * @return A Promise fulfilled with the pattern's estimated cardinality
     */
    estimateCardinality(triple: Algebra.TripleObject): Promise<number>;
    /**
     * Evaluates an union of Basic Graph patterns on the Graph using an iterator.
     * @param  patterns - The set of BGPs to evaluate
     * @param  options - Execution options
     * @return An iterator which evaluates the Basic Graph pattern on the Graph
     */
    evalUnion(patterns: Algebra.TripleObject[][], context: ExecutionContext): ObservableInput<Bindings>;
    /**
     * Evaluates a Basic Graph pattern, i.e., a set of triple patterns, on the Graph using an iterator.
     * @param  bgp - The set of triple patterns to evaluate
     * @param  options - Execution options
     * @return An iterator which evaluates the Basic Graph pattern on the Graph
     */
    evalBGP(bgp: Algebra.TripleObject[], context: ExecutionContext): ObservableInput<Bindings>;
}
