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
    * A Triple pattern in Object format with property path(s)
    */
    export interface PathTripleObject {
      subject: string;
      predicate: PropertyPath;
      object: string;
      graph?: string;
    }

    /**
     * A Property path
     */
    export interface PropertyPath {
      items: Array<string | PropertyPath>;
      pathType: string;
      type: string;
    }

    /**
    * A generic node in a parsed plan
    */
    export interface PlanNode {
      type: string;
    }

    /**
     * An abstract (SPARQL) expression
     */
    export interface Expression {
      type: string;
    }

    /**
     * A SPARQL expression (=, <, +, -, LANG, BOUND, etc)
     */
    export interface SPARQLExpression extends Expression {
      args: Array<string | string[] | Expression>;
      operator: string;
    }

    /**
     * A custom function expression (BIND(foo:FOO(?s) as ?foo)) etc. 
     */
    export interface FunctionCallExpression extends Expression {
      args: Array<string | string[] | Expression>;
      function: string;
      distinct: boolean;
      
    }
    /**
     * An aggregation pexression (COUNT, SUM, AVG, etc)
     */
    export interface AggregateExpression extends Expression {
      aggregation: string;
      expression: string | Expression;
      separator?: string;
    }

    /**
     * A SPARQL aggregation, which bounds an aggregation to a SPARQL variable
     */
    export interface Aggregation {
      variable: string;
      expression: Expression;
    }

    export interface FromNode {
      default: string[];
      named: string[];
    }

    export interface OrderComparator {
      expression: string,
      ascending?: boolean,
      descending?: boolean
    }

    /**
     * Root of a SPARQL 1.1 query
     */
    export interface RootNode extends PlanNode {
      distinct?: boolean;
      prefixes: any;
      queryType: string;
      variables?: Array<string | Aggregation>;
      template?: TripleObject[];
      from?: FromNode;
      where: Array<PlanNode>;
      group?: Array<Aggregation>;
      having?: Array<Expression>;
      order?: Array<OrderComparator>;
      offset?: number;
      limit?: number;
    }

    /**
     * Root of a SPARQL 1.1 UPDATE query
     */
    export interface UpdateRootNode extends PlanNode {
      prefixes: any;
      updates: Array<UpdateQueryNode | UpdateCopyMoveNode>
    }

    /**
     * A SPARQL DELETE/INSERT node
     */
    export interface UpdateQueryNode {
      updateType: string;
      silent?: boolean;
      graph?: string;
      from?: FromNode;
      insert?: Array<BGPNode | UpdateGraphNode>
      delete?: Array<BGPNode | UpdateGraphNode>
      where?: Array<PlanNode>
    }

    /**
     * A SPARQL COPY/MOVE/ADD node
     */
    export interface UpdateCopyMoveNode extends PlanNode {
      /**
       * Destination's graph of the COPY/MOVE operation
       */
      destination: UpdateGraphTarget;
      source: UpdateGraphTarget;
      silent: boolean;
    }

    /**
     * A SPARQL CLEAR node
     */
    export interface UpdateClearNode extends PlanNode {
      silent: boolean;
      graph: UpdateClearTarget;
    }

    /**
     * The source or destination of a SPARQL COPY/MOVE/ADD query
     */
    export interface UpdateGraphTarget extends PlanNode {
      default?: boolean;
      name?: string;
    }

    /**
     * The source or destination of a SPARQL CLEAR query
     */
    export interface UpdateClearTarget extends UpdateGraphTarget {
      named?: string;
      all?: boolean;
    }

    /**
     * A GRAPH Node as found in a SPARQL 1.1 UPDATE query
     */
    export interface UpdateGraphNode extends PlanNode {
      name: string;
      triples: Array<TripleObject>
    }

    /**
    * A SPARQL Basic Graph pattern
    */
    export interface BGPNode extends PlanNode {
      /**
      * BGP's triples
      */
      triples: Array<TripleObject|PathTripleObject>;
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
    * A SPARQL FILTER clause
    */
    export interface FilterNode extends PlanNode {
      expression: SPARQLExpression;
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

    /**
     * A SPARQL BIND node
     */
    export interface BindNode extends PlanNode {
      expression: string | SPARQLExpression;
      variable: string;
    }

    /**
     * A SPARQL VALUES node
     */
    export interface ValuesNode extends PlanNode {
      values: any[]
    }
  }

  /**
   * Compile SPARQL queries from their string representation to logical query execution plans
   */
  export class Parser {
    constructor(prefixes?: any)
    /**
     * Parse a SPARQL query
     * @param  query - String query
     * @return Parsed query
     */
    parse(query: string): Algebra.RootNode;
  }

  /**
   * Compile SPARQL queries from their logical query execution plans to string representations
   */
  export class Generator {
    stringify(plan: Algebra.RootNode): string;
  }
}
