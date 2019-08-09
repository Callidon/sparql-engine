import { Bindings } from '../../rdf/bindings';
/**
 * A HashJoinTable is used by a Hash-based join to save set of bindings corresponding to a joinKey.
 * All bindings corresponding to the save value of the joinKey are aggregated in a list.
 */
export default class HashJoinTable {
    private readonly _content;
    constructor();
    /**
     * Register a pair (value, bindings).
     * @param key - Key used to save the bindings
     * @param bindings - Bindings to save
     */
    put(key: string, bindings: Bindings): void;
    /**
     * Perform a join between a set of bindings and all set of bindings in the table associated with the key.
     * Returns an empty list if there is no join results.
     * @param  key  - Key used to fetch set of set of bindings
     * @param  bindings - Bindings to join with
     * @return Join results, or an empty list if there is none.
     */
    join(key: string, bindings: Bindings): Bindings[];
}
