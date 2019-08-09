import { terms } from './rdf-terms';
import { Observable } from 'rxjs';
import { Algebra } from 'sparqljs';
import { Bindings } from './rdf/bindings';
/**
 * RDF related utilities
 */
export declare namespace rdf {
    /**
     * Parse a RDF term in string format and return a descriptor with its type and value
     * @param  {string} term - The RDF Term in string format (i.e., URI or Literal)
     * @return A descriptor for the term
     * @throws {SyntaxError} Thrown if an unknown RDF Term is encoutered during parsing
     */
    function parseTerm(term: string): terms.RDFTerm;
    /**
     * Create a RDF triple in Object representation
     * @param  {string} subj - Triple's subject
     * @param  {string} pred - Triple's predicate
     * @param  {string} obj  - Triple's object
     * @return A RDF triple in Object representation
     */
    function triple(subj: string, pred: string, obj: string): Algebra.TripleObject;
    /**
     * Count the number of variables in a Triple Pattern
     * @param  {Object} triple - Triple Pattern to process
     * @return The number of variables in the Triple Pattern
     */
    function countVariables(triple: Algebra.TripleObject): number;
    /**
     * Return True if a string is a SPARQL variable
     * @param  {string}  str - String to test
     * @return True if the string is a SPARQL variable, False otherwise
     */
    function isVariable(str: string): boolean;
    /**
     * Create an IRI under the XSD namespace
     * @param suffix - Suffix appended to the XSD namespace to create an IRI
     * @return An new IRI, under the XSD namespac
     */
    function XSD(suffix: string): string;
    /**
     * Create an IRI under the RDF namespace
     * @param suffix - Suffix appended to the RDF namespace to create an IRI
     * @return An new IRI, under the RDF namespac
     */
    function RDF(suffix: string): string;
}
/**
 * Bound a triple pattern using a set of bindings, i.e., substitute variables in the triple pattern
 * using the set of bindings provided
 * @param triple  - Triple pattern
 * @param bindings - Set of bindings
 * @return An new, bounded triple pattern
 */
export declare function applyBindings(triple: Algebra.TripleObject, bindings: Bindings): Algebra.TripleObject;
/**
 * Recursively apply bindings to every triple in a SPARQL group pattern
 * @param  {Object} group - SPARQL group pattern to process
 * @param  {Bindings} bindings - Set of bindings to use
 * @return A new SPARQL group pattern with triples bounded
 */
export declare function deepApplyBindings(group: Algebra.PlanNode, bindings: Bindings): Algebra.PlanNode;
/**
 * Extends all set of bindings produced by an iterator with another set of bindings
 * @param  source - Source terator
 * @param  bindings - Bindings added to each set of bindings procuded by the iterator
 * @return An iterator that extends bindins produced by the source iterator
 */
export declare function extendByBindings(source: Observable<Bindings>, bindings: Bindings): Observable<Bindings>;
