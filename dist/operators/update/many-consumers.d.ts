import { Consumable } from './consumer';
/**
 * ManyConsumers group multiple {@link Consumable} to be evaluated in sequence
 * @author Thomas Minier
 */
export default class ManyConsumers implements Consumable {
    private readonly _consumers;
    /**
     * Constructor
     * @param consumers - Set of consumables
     */
    constructor(consumers: Consumable[]);
    execute(): Promise<void>;
}
