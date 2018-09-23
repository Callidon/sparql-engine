interface Triple {
  subject?: string,
  predicate?:string,
  object?:string,
  graph?: string
}

declare module 'n3' {
  export class Parser {
    parse (input: string): Triple[];
  }

  export namespace Util {
    export function isIRI(term: string): boolean;
    export function isLiteral(term: string): boolean;
    export function getLiteralValue(term: string): string;
    export function getLiteralLanguage(term: string): string;
    export function getLiteralType(term: string): string;
  }
}
