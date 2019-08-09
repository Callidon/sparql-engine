import { Bindings } from '../rdf/bindings';
/**
 * Applies a DISTINCT modifier on the output of another operator.
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modDuplicates}
 * @author Thomas Minier
 */
export default function sparqlDistinct(): import("rxjs").MonoTypeOperatorFunction<Bindings>;
