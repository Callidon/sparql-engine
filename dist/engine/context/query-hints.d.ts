import { Algebra } from 'sparqljs';
/**
 * Build an URI under the <http://www.bigdata.com/queryHints#> namespace
 * @param  suffix - Suffix append to the HINT namespace
 * @return A new URI under the HINT namespace
 */
export declare function HINT(suffix: string): string;
/**
 * Scopes of a query hint, i.e., Query or Basic Graph pattern
 */
export declare enum QUERY_HINT_SCOPE {
    QUERY = 0,
    BGP = 1
}
/**
 * Types of query hints
 */
export declare enum QUERY_HINT {
    USE_HASH_JOIN = 0,
    USE_SYMMETRIC_HASH_JOIN = 1,
    SORTED_TRIPLES = 2
}
export declare class QueryHints {
    protected _bgpHints: Map<QUERY_HINT, boolean>;
    constructor();
    /**
     * Clone the set of query hints
     * @return The cloned set of query hints
     */
    clone(): QueryHints;
    /**
     * Merge the current hints with another set of hints
     * @param  other - Query hints to merge with
     * @return The merged set of query hints
     */
    merge(other: QueryHints): QueryHints;
    /**
     * Add a query hint to the set
     * @param scope - Scope of the hint (Query, BGP, etc)
     * @param hint - Type of hint
     */
    add(scope: QUERY_HINT_SCOPE, hint: QUERY_HINT): void;
    /**
     * Test if a hint exists
     * @param scope - Scope of the hint (Query, BGP, etc)
     * @param hint - Type of hint
     * @return True if the hint exists, False otherwise
     */
    has(scope: QUERY_HINT_SCOPE, hint: QUERY_HINT): boolean;
    /**
     * Serialize the set of query hints into a string
     * @return A string which represents the set of query hints
     */
    toString(): string;
}
export declare function parseHints(bgp: Algebra.TripleObject[], previous?: QueryHints): [Algebra.TripleObject[], QueryHints];
