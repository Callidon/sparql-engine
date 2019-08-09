import PlanBuilder from '../plan-builder';
/**
 * An Executor encaspulate a strategy for executing SPARQL operations
 * @abstract
 * @author Thomas Minier
 */
export default abstract class Executor {
    protected _builder: PlanBuilder | null;
    constructor();
    builder: PlanBuilder | null;
}
