import { Algebra } from 'sparqljs';
/**
 * A set of mappings from a variable to a RDF Term.
 * @abstract
 * @author Thomas Minier
 */
export declare abstract class Bindings {
    private readonly _properties;
    constructor();
    /**
     * The number of mappings in the set
     * @return The number of mappings in the set
     */
    abstract readonly size: number;
    /**
     * Returns True if the set is empty, False otherwise
     * @return True if the set is empty, False otherwise
     */
    abstract readonly isEmpty: boolean;
    /**
     * Get an iterator over the SPARQL variables in the set
     * @return An iterator over the SPARQL variables in the set
     */
    abstract variables(): IterableIterator<string>;
    /**
     * Get an iterator over the RDF terms in the set
     * @return An iterator over the RDF terms in the set
     */
    abstract values(): IterableIterator<string>;
    /**
     * Get the RDF Term associated with a SPARQL variable
     * @param variable - SPARQL variable
     * @return The RDF Term associated with the given SPARQL variable
     */
    abstract get(variable: string): string | null;
    /**
     * Test if mappings exists for a SPARQL variable
     * @param variable - SPARQL variable
     * @return True if a mappings exists for this variable, False otherwise
     */
    abstract has(variable: string): boolean;
    /**
     * Add a mapping SPARQL variable -> RDF Term to the set
     * @param variable - SPARQL variable
     * @param value - RDF Term
     */
    abstract set(variable: string, value: string): void;
    /**
     * Get metadata attached to the set using a key
     * @param  key - Metadata key
     * @return The metadata associated with the given key
     */
    getProperty(key: string): any;
    /**
     * Check if a metadata with a given key is attached to the set
     * @param  key - Metadata key
     * @return Tur if the metadata exists, False otherwise
     */
    hasProperty(key: string): boolean;
    /**
     * Attach metadata to the set
     * @param key - Key associated to the value
     * @param value - Value to attach
     */
    setProperty(key: string, value: any): void;
    /**
     * Invoke a callback on each mapping
     * @param callback - Callback to invoke
     * @return
     */
    abstract forEach(callback: (variable: string, value: string) => void): void;
    /**
     * Remove all mappings from the set
     * @return
     */
    abstract clear(): void;
    /**
     * Returns an empty set of mappings
     * @return An empty set of mappings
     */
    abstract empty(): Bindings;
    /**
     * Serialize the set of mappings as a plain JS Object
     * @return The set of mappings as a plain JS Object
     */
    toObject(): Object;
    /**
     * Serialize the set of mappings as a string
     * @return The set of mappings as a string
     */
    toString(): string;
    /**
     * Creates a deep copy of the set of mappings
     * @return A deep copy of the set
     */
    clone(): Bindings;
    /**
     * Test the equality between two sets of mappings
     * @param other - A set of mappings
     * @return True if the two sets are equal, False otherwise
     */
    equals(other: Bindings): boolean;
    /**
     * Bound a triple pattern using the set of mappings, i.e., substitute variables in the triple pattern
     * @param triple  - Triple pattern
     * @return An new, bounded triple pattern
     */
    bound(triple: Algebra.TripleObject): Algebra.TripleObject;
    /**
     * Creates a new bindings with additionnal mappings
     * @param values - Pairs [variable, value] to add to the set
     * @return A new Bindings with the additionnal mappings
     */
    extendMany(values: Array<[string, string]>): Bindings;
    /**
     * Perform the union of the set of mappings with another set
     * @param other - Set of mappings
     * @return The Union set of mappings
     */
    union(other: Bindings): Bindings;
    /**
     * Perform the intersection of the set of mappings with another set
     * @param other - Set of mappings
     * @return The intersection set of mappings
     */
    intersection(other: Bindings): Bindings;
    /**
    * Performs a set difference with another set of mappings, i.e., A.difference(B) returns all mappings that are in A and not in B.
    * @param  other - Set of mappings
    * @return The results of the set difference
    */
    difference(other: Bindings): Bindings;
    /**
     * Test if the set of bindings is a subset of another set of mappings.
     * @param  other - Superset of mappings
     * @return Ture if the set of bindings is a subset of another set of mappings, False otherwise
     */
    isSubset(other: Bindings): boolean;
    /**
     * Creates a new set of mappings using a function to transform the current set
     * @param mapper - Transformation function (variable, value) => [string, string]
     * @return A new set of mappings
     */
    map(mapper: (variable: string, value: string) => [string | null, string | null]): Bindings;
    /**
     * Same as map, but only transform variables
     * @param mapper - Transformation function
     * @return A new set of mappings
     */
    mapVariables(mapper: (variable: string, value: string) => string | null): Bindings;
    /**
     * Same as map, but only transform values
     * @param mapper - Transformation function
     * @return A new set of mappings
     */
    mapValues(mapper: (variable: string, value: string) => string | null): Bindings;
    /**
     * Filter mappings from the set of mappings using a predicate function
     * @param predicate - Predicate function
     * @return A new set of mappings
     */
    filter(predicate: (variable: string, value: string) => boolean): Bindings;
    /**
     * Reduce the set of mappings to a value which is the accumulated result of running each element in collection thru a reducing function, where each successive invocation is supplied the return value of the previous.
     * @param reducer - Reducing function
     * @param start - Value used to start the accumulation
     * @return The accumulated value
     */
    reduce<T>(reducer: (acc: T, variable: string, value: string) => T, start: T): T;
    /**
     * Test if some mappings in the set pass a predicate function
     * @param  predicate - Function to test for each mapping
     * @return True if some mappings in the set some the predicate function, False otheriwse
     */
    some(predicate: (variable: string, value: string) => boolean): boolean;
    /**
     * Test if every mappings in the set pass a predicate function
     * @param  predicate - Function to test for each mapping
     * @return True if every mappings in the set some the predicate function, False otheriwse
     */
    every(predicate: (variable: string, value: string) => boolean): boolean;
}
/**
 * A set of mappings from a variable to a RDF Term, implements using a HashMap
 * @author Thomas Minier
 */
export declare class BindingBase extends Bindings {
    private readonly _content;
    constructor();
    readonly size: number;
    readonly isEmpty: boolean;
    /**
     * Creates a set of mappings from a plain Javascript Object
     * @param obj - Source object to turn into a set of mappings
     * @return A set of mappings
     */
    static fromObject(obj: Object): Bindings;
    variables(): IterableIterator<string>;
    values(): IterableIterator<string>;
    get(variable: string): string | null;
    has(variable: string): boolean;
    set(variable: string, value: string): void;
    clear(): void;
    empty(): Bindings;
    forEach(callback: (variable: string, value: string) => void): void;
}
