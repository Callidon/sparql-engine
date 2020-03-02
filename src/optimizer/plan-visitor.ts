/* file : plan-visitor.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

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

'use strict'

import { Algebra } from 'sparqljs'
import { cloneDeep } from 'lodash'

/**
 * A Visitor which performs a Depth-first traversal of a SPARQL query expression tree
 * and transforms each node.
 * Subclasses are used to implements SPARQl query optimization rules.
 * @author Thomas Minier
 */
export default class PlanVisitor {
  /**
   * Visit all nodes starting from this one, using a depth-first traversal,
   * and transform them.
   * @param  node - Root of the expression tree to traverse
   * @return The transformed expression tree
   */
  visit (node: Algebra.PlanNode): Algebra.PlanNode {
    switch (node.type) {
      case 'query':
        const newNode = cloneDeep(node) as Algebra.RootNode
        newNode.where = (node as Algebra.RootNode).where.map(n => this.visit(n))
        return newNode
      case 'bgp':
        return this.visitBGP(node as Algebra.BGPNode)
      case 'union':
        return this.visitUnion(node as Algebra.GroupNode)
      case 'optional':
        return this.visitOptional(node as Algebra.GroupNode)
      case 'group':
        return this.visitGroup(node as Algebra.GroupNode)
      case 'filter':
        return this.visitFilter(node as Algebra.FilterNode)
      case 'service':
        return this.visitService(node as Algebra.ServiceNode)
      case 'bind':
        return this.visitBind(node as Algebra.BindNode)
      case 'values':
        return this.visitValues(node as Algebra.ValuesNode)
      default:
        return node
    }
  }

  /**
   * Visit and transform a Basic Graph Pattern node.
   * By default, peform no transformation on the node.
   * @param  node - Basic Graph Pattern node
   * @return The transformed Basic Graph Pattern node
   */
  visitBGP (node: Algebra.BGPNode): Algebra.PlanNode {
    return node
  }

  /**
   * Visit and transform a SPARQL Group pattern node.
   * By default, recursively transform all members of the group.
   * @param  node - SPARQL Group pattern node
   * @return The transformed SPARQL Group pattern node
   */
  visitGroup (node: Algebra.GroupNode): Algebra.PlanNode {
    const newNode = cloneDeep(node)
    newNode.patterns = newNode.patterns.map(p => this.visit(p))
    return newNode
  }

  /**
   * Visit and transform a SPARQL OPTIONAL node.
   * By default, recursively transform all members of the OPTIONAL.
   * @param  node - SPARQL OPTIONAL node
   * @return The transformed SPARQL OPTIONAL node
   */
  visitOptional (node: Algebra.GroupNode): Algebra.PlanNode {
    const newNode = cloneDeep(node)
    newNode.patterns = newNode.patterns.map(p => this.visit(p))
    return newNode
  }

  /**
   * Visit and transform a SPARQL UNION node.
   * By default, recursively transform all members of the UNION.
   * @param  node - SPARQL UNION node
   * @return The transformed SPARQL UNION node
   */
  visitUnion (node: Algebra.GroupNode): Algebra.PlanNode {
    const newNode = cloneDeep(node)
    newNode.patterns = newNode.patterns.map(p => this.visit(p))
    return newNode
  }

  /**
   * Visit and transform a SPARQL FILTER node.
   * By default, peform no transformation on the node.
   * @param  node - SPARQL FILTER node
   * @return The transformed SPARQL FILTER node
   */
  visitFilter (node: Algebra.FilterNode): Algebra.PlanNode {
    return node
  }

  /**
   * Visit and transform a SPARQL GRAPH node.
   * By default, recursively transform all members of the GRAPH.
   * @param  node - SPARQL GRAPH node
   * @return The transformed SPARQL GRAPH node
   */
  visitGraph (node: Algebra.GraphNode): Algebra.PlanNode {
    const newNode = cloneDeep(node)
    newNode.patterns = newNode.patterns.map(p => this.visit(p))
    return newNode
  }

  /**
   * Visit and transform a SPARQL SERVICE node.
   * By default, recursively transform all members of the SERVICE.
   * @param  node - SPARQL SERVICE node
   * @return The transformed SPARQL SERVICE node
   */
  visitService (node: Algebra.ServiceNode): Algebra.PlanNode {
    const newNode = cloneDeep(node)
    newNode.patterns = newNode.patterns.map(p => this.visit(p))
    return newNode
  }

  /**
   * Visit and transform a SPARQL BIND node.
   * By default, peform no transformation on the node.
   * @param  node - SPARQL BIND node
   * @return The transformed SPARQL BIND node
   */
  visitBind (node: Algebra.BindNode): Algebra.PlanNode {
    return node
  }

  /**
   * Visit and transform a SPARQL VALUES node.
   * By default, peform no transformation on the node.
   * @param  node - SPARQL VALUES node
   * @return The transformed SPARQL VALUES node
   */
  visitValues (node: Algebra.ValuesNode): Algebra.PlanNode {
    return node
  }
}
