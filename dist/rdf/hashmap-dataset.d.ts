import Graph from './graph';
import Dataset from './dataset';
/**
 * A simple Dataset backed by a HashMap.
 * @extends Dataset
 * @author Thomas Minier
 */
export default class HashMapDataset extends Dataset {
    private _defaultGraph;
    private readonly _namedGraphs;
    /**
     * Constructor
     * @param defaultGraphIRI - IRI of the Default Graph
     * @param defaultGraph     - Default Graph
     */
    constructor(defaultGraphIRI: string, defaultGraph: Graph);
    readonly iris: string[];
    setDefaultGraph(g: Graph): void;
    getDefaultGraph(): Graph;
    addNamedGraph(iri: string, g: Graph): void;
    getNamedGraph(iri: string): Graph;
    hasNamedGraph(iri: string): boolean;
}
