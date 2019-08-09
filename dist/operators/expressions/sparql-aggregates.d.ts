import { terms } from '../../rdf-terms';
declare const _default: {
    'count': (variable: string, rows: Object[]) => terms.RDFTerm;
    'sum': (variable: string, rows: Object[]) => terms.RDFTerm;
    'avg': (variable: string, rows: Object[]) => terms.RDFTerm;
    'min': (variable: string, rows: Object[]) => terms.RDFTerm;
    'max': (variable: string, rows: Object[]) => terms.RDFTerm;
    'group_concat': (variable: string, rows: Object[], sep: string) => terms.RDFTerm;
    'sample': (variable: string, rows: Object[]) => terms.RDFTerm;
};
/**
 * SPARQL Aggregation operations.
 * Each operation takes an arguments a SPARQL variable and a row of bindings, i.e., a list of
 * solutions bindings on which the aggregation must be applied.
 * Each operations is expected to return a term, as with classic SPARQL operations
 * @see https://www.w3.org/TR/sparql11-query/#aggregateAlgebra
 * @author Thomas Minier
 */
export default _default;
