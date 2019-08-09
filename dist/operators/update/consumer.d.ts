/// <reference types="node" />
import { Observable } from 'rxjs';
import { Writable } from 'stream';
import { Algebra } from 'sparqljs';
/**
 * Something whose execution can be resolved as a Promise
 */
export interface Consumable {
    /**
     * Execute the consumable
     * @return A Promise fulfilled when the execution has been completed
     */
    execute(): Promise<void>;
}
/**
 * A Consumable that always fails to execute
 */
export declare class ErrorConsumable implements Consumable {
    private readonly _reason;
    /**
     * Constructor
     * @param reason - Cause of the failure
     */
    constructor(reason: string);
    execute(): Promise<void>;
}
/**
 * A Consumer consumes bindings from an iterator to evaluate a SPARQL UPDATE query
 * @abstract
 * @extends Writable
 * @author Thomas Minier
 */
export declare abstract class Consumer extends Writable implements Consumable {
    private readonly _source;
    private readonly _options;
    /**
     * Constructor
     * @param source - Source iterator
     * @param options - Execution options
     */
    constructor(source: Observable<Algebra.TripleObject>, options: Object);
    execute(): Promise<void>;
}
