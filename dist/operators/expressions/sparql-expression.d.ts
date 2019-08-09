import { terms } from '../../rdf-terms';
import { Algebra } from 'sparqljs';
import { Bindings } from '../../rdf/bindings';
import { CustomFunctions } from '../../engine/plan-builder';
/**
 * An input SPARQL expression to be compiled
 */
export declare type InputExpression = Algebra.Expression | string | string[];
/**
 * A SPARQL expression compiled as a function
 */
export declare type CompiledExpression = (bindings: Bindings) => terms.RDFTerm | terms.RDFTerm[] | null;
/**
 * Compile and evaluate a SPARQL expression (found in FILTER clauses, for example)
 * @author Thomas Minier
 */
export default class SPARQLExpression {
    private readonly _expression;
    /**
     * Constructor
     * @param expression - SPARQL expression
     */
    constructor(expression: InputExpression, customFunctions?: CustomFunctions);
    /**
     * Recursively compile a SPARQL expression into a function
     * @param  expression - SPARQL expression
     * @return Compiled SPARQL expression
     */
    private _compileExpression;
    /**
     * Evaluate the expression using a set of mappings
     * @param  bindings - Set of mappings
     * @return Results of the evaluation
     */
    evaluate(bindings: Bindings): terms.RDFTerm | terms.RDFTerm[] | null;
}
