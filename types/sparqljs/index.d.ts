/* file : sparqljs.d.ts
MIT License

Copyright (c) 2018 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


declare module 'sparqljs' {
  export namespace Algebra {
    /**
    * A Triple pattern in Object format
    */
    export interface TripleObject {
      subject: string;
      predicate: string;
      object: string;
      graph?: string;
    }

    /**
    * A generic node in a parsed plan
    */
    export interface PlanNode {
      type: string;
    }

    /**
    * Root node of a plan
    */
    export interface RootNode extends PlanNode {
      distinct?: boolean;
      prefixes: any;
      queryType: string;
      variables: Array<string>;
      where: Array<PlanNode>;
    }

    /**
    * A SPARQL Basic Graph pattern
    */
    export interface BGPNode extends PlanNode {
      /**
      * BGP's triples
      */
      triples: Array<TripleObject>;
    }

    /**
    * A SPARQL Group, i.e., a union, optional or neutral group
    */
    export interface GroupNode extends PlanNode {
      /**
      * Group's patterns
      */
      patterns: Array<PlanNode>;
    }

    /**
    * An expression in a filter clause
    */
    export interface FilterExpression extends PlanNode {
      /**
      * Arguments of the expression
      */
      args: Array<string | FilterExpression>;

      /**
      * Operator name
      */
      operator: string;
    }

    /**
    * A SPARQL FILTER clause
    */
    export interface FilterNode extends PlanNode {
      expression: FilterExpression;
    }

    /**
    * A SPARQL GRAPH clause
    */
    export interface GraphNode extends GroupNode {
      /**
      * Graph's name
      */
      name: string;
    }

    /**
    * A SPARQL SERVICE clause
    */
    export interface ServiceNode extends GraphNode {
      /**
      * True if the SERVICE must be silent, False otherwise
      */
      silent: boolean;
    }
  }

  export class Parser {
    /**
     * Parse a SPARQL query from a string representation to a intermediate format
     * @param  query [string] - String query
     * @return Parsed query
     */
    parse(query: string): Algebra.RootNode;
  }

  export class Generator {
    stringify(plan: Algebra.RootNode): string;
  }
}
