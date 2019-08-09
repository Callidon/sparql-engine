import { Moment } from 'moment';
/**
 * Utilities used to manipulate RDF terms
 * @param  iri [description]
 * @return     [description]
 */
export declare namespace terms {
    /**
     * An intermediate format to represent RDF Terms
     */
    interface RDFTerm {
        /**
         * Type of the term
         */
        readonly type: string;
        /**
         * Value of the term, in string format
         */
        readonly value: string;
        /**
         * RDF representation of the term
         */
        readonly asRDF: string;
        /**
         * JS representation of the term
         */
        readonly asJS: any;
    }
    /**
     * An intermediate format to represent RDF IRIs
     */
    interface IRI extends RDFTerm {
    }
    /**
     * An intermediate format to represent RDF plain Literals
     */
    interface RawLiteral extends RDFTerm {
    }
    /**
     * An intermediate format to represent RDF Literal with a language tag
     */
    interface LangLiteral extends RDFTerm {
        /**
         * Language tag
         */
        readonly lang: string;
    }
    /**
     * An intermediate format to represent RDF Literal with a datatype
     */
    interface TypedLiteral extends RDFTerm {
        /**
         * Datatype
         */
        readonly datatype: string;
    }
    /**
     * Creates an IRI in {@link RDFTerm} format
     * @see https://www.w3.org/TR/rdf11-concepts/#section-IRIs
     * @param iri - IRI
     * @return A new IRI in {@link RDFTerm} format
     */
    function createIRI(iri: string): IRI;
    /**
     * Creates a Literal in {@link RDFTerm} format
     * @see https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
     * @param literal - Literal
     * @return A new Literal in {@link RDFTerm} format
     */
    function createLiteral(literal: string): RawLiteral;
    /**
     * Creates a Literal with a datatype, in {@link RDFTerm} format
     * @see https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
     * @param literal - Literal
     * @param type - Literal datatype
     * @return A new typed Literal in {@link RDFTerm} format
     */
    function createTypedLiteral(literal: string, type: string): TypedLiteral;
    /**
     * Creates a Literal with a language tag, in {@link RDFTerm} format
     * @see https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
     * @param literal - Literal
     * @param lang - Language tag
     * @return A new tagged Literal in {@link RDFTerm} format
     */
    function createLangLiteral(literal: string, lang: string): LangLiteral;
    /**
     * Creates a Literal from a boolean, in {@link RDFTerm} format
     * @param value - Boolean
     * @return A new typed Literal in {@link RDFTerm} format
     */
    function createBoolean(value: boolean): TypedLiteral;
    /**
     * Creates a Literal from a number, in {@link RDFTerm} format
     * @param value - Number
     * @param type - Literal type
     * @return A new typed Literal in {@link RDFTerm} format
     */
    function createNumber(value: number, type: string): TypedLiteral;
    /**
     * Creates a Literal from a Moment date, in {@link RDFTerm} format
     * @param date - A Date, in Moment format
     * @return A new typed Literal in {@link RDFTerm} format
     */
    function createDate(date: Moment): TypedLiteral;
    /**
     * Clone a literal and replace its value with another one
     * @param  base     - Literal to clone
     * @param  newValue - New literal value
     * @return The literal with its new value
     */
    function replaceLiteralValue(term: RDFTerm, newValue: string): RDFTerm;
    /**
     * Test if Two RDF Terms are equals
     * @see https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
     * @param left - Left Term
     * @param right - Right term
     * @return A RDF Literal with the results of the test (True or False)
     */
    function equals(left: RDFTerm, right: RDFTerm): RDFTerm;
    /**
     * Test if a RDF Term is an IRI
     * @param  term - RDF Term to test
     * @return True if the term is an IRI, False otherwise
     */
    function isIRI(term: RDFTerm): boolean;
    /**
     * Test if a RDF Term is a Literal (regardless of the lang/datatype)
     * @param  term - RDF Term to test
     * @return True if the term is a Literal, False otherwise
     */
    function isLiteral(term: RDFTerm): boolean;
    /**
     * Test if a RDF Term is a Literal with a datatype
     * @param  term - RDF Term to test
     * @return True if the term is a Literal with a datatype, False otherwise
     */
    function isTypedLiteral(term: RDFTerm): boolean;
    /**
     * Test if a RDF Term is a Literal with a language
     * @param  term - RDF Term to test
     * @return True if the term is a Literal with a language, False otherwise
     */
    function isLangLiteral(term: RDFTerm): boolean;
    /**
     * Test if a RDF Term is a Date literal
     * @param  literal - RDF Term to test
     * @return True if the term is a Date literal, False otherwise
     */
    function isDate(literal: RDFTerm): boolean;
    /**
     * Test if a RDF Term is a Number literal (float, int, etc)
     * @param  literal - RDF Term to test
     * @return True if the term is a Number literal, False otherwise
     */
    function isNumber(term: RDFTerm): boolean;
}
