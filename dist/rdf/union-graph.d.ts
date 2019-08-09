import { ObservableInput } from 'rxjs';
import Graph from './graph';
import { Algebra } from 'sparqljs';
import ExecutionContext from '../engine/context/execution-context';
/**
 * An UnionGraph represents the dynamic union of several graphs.
 * Addition only affects the left-most operand, deletion affects all graphs.
 * Searching for RDF triple smatching a triple pattern in such Graph is equivalent
 * as the Union of matching RDF triples in all graphs.
 * @extends Graph
 * @author Thomas Minier
 */
export default class UnionGraph extends Graph {
    private readonly _graphs;
    /**
     * Constructor
     * @param graphs - Set of RDF graphs
     */
    constructor(graphs: Graph[]);
    insert(triple: Algebra.TripleObject): Promise<void>;
    delete(triple: Algebra.TripleObject): Promise<void>;
    find(triple: Algebra.TripleObject, context: ExecutionContext): ObservableInput<Algebra.TripleObject>;
    clear(): Promise<void>;
    estimateCardinality(triple: Algebra.TripleObject): Promise<number>;
}
