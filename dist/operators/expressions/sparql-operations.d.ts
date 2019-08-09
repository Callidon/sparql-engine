import { terms } from '../../rdf-terms';
declare const _default: {
    '+': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '-': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '*': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '/': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '=': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '!=': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '<': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '<=': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '>': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '>=': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '!': (a: terms.RDFTerm) => terms.RDFTerm;
    '&&': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    '||': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    'bound': (a: terms.RDFTerm) => terms.TypedLiteral;
    'sameterm': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    'in': (a: terms.RDFTerm, b: terms.RDFTerm[]) => terms.RDFTerm;
    'notin': (a: terms.RDFTerm, b: terms.RDFTerm[]) => terms.RDFTerm;
    'isiri': (a: terms.RDFTerm) => terms.RDFTerm;
    'isblank': (a: terms.RDFTerm) => terms.RDFTerm;
    'isliteral': (a: terms.RDFTerm) => terms.RDFTerm;
    'isnumeric': (a: terms.RDFTerm) => terms.RDFTerm;
    'str': (a: terms.RDFTerm) => terms.RDFTerm;
    'lang': (a: terms.RDFTerm) => terms.RDFTerm;
    'datatype': (a: terms.RDFTerm) => terms.RDFTerm;
    'iri': (a: terms.RDFTerm) => terms.RDFTerm;
    'strdt': (x: terms.RDFTerm, datatype: terms.RDFTerm) => terms.RDFTerm;
    'strlang': (x: terms.RDFTerm, lang: terms.RDFTerm) => terms.RDFTerm;
    'uuid': () => terms.RDFTerm;
    'struuid': () => terms.RDFTerm;
    'strlen': (a: terms.RDFTerm) => terms.RDFTerm;
    'substr': (str: terms.RDFTerm, index: terms.RDFTerm, length?: terms.RDFTerm | undefined) => terms.RDFTerm;
    'ucase': (a: terms.RDFTerm) => terms.RDFTerm;
    'lcase': (a: terms.RDFTerm) => terms.RDFTerm;
    'strstarts': (string: terms.RDFTerm, substring: terms.RDFTerm) => terms.RDFTerm;
    'strends': (string: terms.RDFTerm, substring: terms.RDFTerm) => terms.RDFTerm;
    'contains': (string: terms.RDFTerm, substring: terms.RDFTerm) => terms.RDFTerm;
    'strbefore': (str: terms.RDFTerm, token: terms.RDFTerm) => terms.RDFTerm;
    'strafter': (str: terms.RDFTerm, token: terms.RDFTerm) => terms.RDFTerm;
    'encode_for_uri': (a: terms.RDFTerm) => terms.RDFTerm;
    'concat': (a: terms.RDFTerm, b: terms.RDFTerm) => terms.RDFTerm;
    'langmatches': (langTag: terms.RDFTerm, langRange: terms.RDFTerm) => terms.RDFTerm;
    'regex': (subject: terms.RDFTerm, pattern: terms.RDFTerm, flags: terms.RDFTerm) => terms.TypedLiteral;
    'abs': (a: terms.RDFTerm) => terms.RDFTerm;
    'round': (a: terms.RDFTerm) => terms.RDFTerm;
    'ceil': (a: terms.RDFTerm) => terms.RDFTerm;
    'floor': (a: terms.RDFTerm) => terms.RDFTerm;
    'now': () => terms.RDFTerm;
    'year': (a: terms.RDFTerm) => terms.RDFTerm;
    'month': (a: terms.RDFTerm) => terms.RDFTerm;
    'day': (a: terms.RDFTerm) => terms.RDFTerm;
    'hours': (a: terms.RDFTerm) => terms.RDFTerm;
    'minutes': (a: terms.RDFTerm) => terms.RDFTerm;
    'seconds': (a: terms.RDFTerm) => terms.RDFTerm;
    'tz': (a: terms.RDFTerm) => terms.RDFTerm;
    'md5': (v: terms.RDFTerm) => terms.RDFTerm;
    'sha1': (v: terms.RDFTerm) => terms.RDFTerm;
    'sha256': (v: terms.RDFTerm) => terms.RDFTerm;
    'sha384': (v: terms.RDFTerm) => terms.RDFTerm;
    'sha512': (v: terms.RDFTerm) => terms.RDFTerm;
};
/**
 * Implementation of SPARQL operations found in FILTERS
 * All arguments are pre-compiled from string to an intermediate representation.
 * All possible intermediate representation are gathered in the `src/rdf-terms.js` file,
 * and are used to represents RDF Terms.
 * Each SPARQL operation is also expected to return the same kind of intermediate representation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default _default;
