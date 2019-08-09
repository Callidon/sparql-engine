import { QueryHints } from './query-hints';
/**
 * An execution context conatains control information for query execution.
 */
export default class ExecutionContext {
    protected _properties: Map<string, any>;
    protected _hints: QueryHints;
    protected _defaultGraphs: string[];
    protected _namedGraphs: string[];
    constructor();
    /**
     * The set of graphs used as the default graph
     * @return The set of graphs used as the default graph
     */
    /**
    * Update the set of graphs used as the default graph
    * @param  values - The set of graphs used as the default graph
    */
    defaultGraphs: string[];
    /**
     * The set of graphs used as named graphs
     * @return The set of graphs used as named graphs
     */
    /**
    * Update the set of graphs used as named graphs
    * @param  values - The set of graphs used as named graphs
    */
    namedGraphs: string[];
    /**
     * Get query hints collected until now
     * @return All query hints collected until now
     */
    /**
    * Update the query hints
    * @param  newHints - New query hints
    */
    hints: QueryHints;
    /**
     * Get a property associated with a key
     * @param  key - Key associated with the property
     * @return  The value associated with the key
     */
    getProperty(key: string): any | null;
    /**
     * Test if the context contains a property associated with a key
     * @param  key - Key associated with the property
     * @return True if the context contains a property associated with the key
     */
    hasProperty(key: string): boolean;
    /**
     * Set a (key, value) property in the context
     * @param key - Key of the property
     * @param value - Value of the property
     */
    setProperty(key: string, value: any): void;
    /**
     * Clone the execution context
     * @return A clone of the execution context
     */
    clone(): ExecutionContext;
    /**
     * Merge the context with another execution context
     * @param  other - Execution context to merge with
     * @return The merged execution context
     */
    merge(other: ExecutionContext): ExecutionContext;
}
