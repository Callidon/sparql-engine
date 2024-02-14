/* file : automatonBuilder.ts
MIT License

Copyright (c) 2019 Thomas Minier

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

import { rdf } from '../../../utils.js'
import { Automaton, State, Transition } from './automaton.js'

/**
 * Interface of something that builds an automaton
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
interface AutomatonBuilder<T, P> {
  build(): Automaton<T, P>
}

/**
 * Perform the union of two sets
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 * @param setA - first set
 * @param setB - second set
 * @return The union of the two sets
 */
export function union(setA: Set<number>, setB: Set<number>): Set<number> {
  const union: Set<number> = new Set(setA)
  setB.forEach((value) => {
    union.add(value)
  })
  return union
}

/**
 * A GlushkovBuilder is responsible for build the automaton used to evaluate a SPARQL property path.
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
export class GlushkovBuilder implements AutomatonBuilder<number, rdf.Term> {
  private static predicateTest = (
    predicates: Array<rdf.Term>,
    value: rdf.Term,
  ): boolean => {
    return predicates.some((predicate: rdf.Term) => {
      return predicate.equals(value)
    })
  }

  private syntaxTree: any
  private nullable: Map<number, boolean>
  private first: Map<number, Set<number>>
  private last: Map<number, Set<number>>
  private follow: Map<number, Set<number>>
  private predicates: Map<number, Array<rdf.Term>>
  private reverse: Map<number, boolean>
  private negation: Map<number, boolean>

  /**
   * Constructor
   * @param path - Path object
   */
  constructor(path: any) {
    this.syntaxTree = path
    this.nullable = new Map<number, boolean>()
    this.first = new Map<number, Set<number>>()
    this.last = new Map<number, Set<number>>()
    this.follow = new Map<number, Set<number>>()
    this.predicates = new Map<number, Array<rdf.Term>>()
    this.reverse = new Map<number, boolean>()
    this.negation = new Map<number, boolean>()
  }

  /**
   * Numbers the nodes in a postorder manner
   * @param node - syntactic tree's current node
   * @param num  - first identifier to be assigned
   * @return root node identifier
   */
  postfixNumbering(node: any, num: number = 1): number {
    if (node.pathType !== 'symbol') {
      for (let i = 0; i < node.items.length; i++) {
        if (node.items[i].pathType === undefined) {
          // it's a leaf
          node.items[i] = {
            pathType: 'symbol',
            item: node.items[i],
          }
        }
        num = this.postfixNumbering(node.items[i], num)
      }
    }
    node.id = num++
    if (node.pathType === '!') {
      num += 2 // to create the two nodes in the negation processing step
    }
    return num
  }

  symbolProcessing(node: any) {
    this.nullable.set(node.id, false)
    this.first.set(node.id, new Set<number>().add(node.id))
    this.last.set(node.id, new Set<number>().add(node.id))
    this.follow.set(node.id, new Set<number>())
    this.predicates.set(node.id, [node.item])
    this.reverse.set(node.id, false)
    this.negation.set(node.id, false)
  }

  sequenceProcessing(node: any) {
    let index
    let nullableChild

    let nullableNode = true
    for (let i = 0; i < node.items.length; i++) {
      nullableChild = this.nullable.get(node.items[i].id) as boolean
      nullableNode = nullableNode && nullableChild
    }
    this.nullable.set(node.id, nullableNode)

    let firstNode = new Set<number>()
    index = -1
    do {
      index++
      const firstChild = this.first.get(node.items[index].id) as Set<number>
      firstNode = union(firstNode, firstChild)
      nullableChild = this.nullable.get(node.items[index].id) as boolean
    } while (index < node.items.length - 1 && nullableChild)
    this.first.set(node.id, firstNode)

    let lastNode = new Set<number>()
    index = node.items.length
    do {
      index--
      const lastChild = this.last.get(node.items[index].id) as Set<number>
      lastNode = union(lastNode, lastChild)
      nullableChild = this.nullable.get(node.items[index].id) as boolean
    } while (index > 0 && nullableChild)
    this.last.set(node.id, lastNode)

    const self = this
    for (let i = 0; i < node.items.length - 1; i++) {
      const lastChild = this.last.get(node.items[i].id) as Set<number>
      lastChild.forEach((value: number) => {
        let suiv = i
        let followChildLast = self.follow.get(value) as Set<number>
        let nullableNextChild = false
        do {
          suiv++
          const firstNextChild = self.first.get(
            node.items[suiv].id,
          ) as Set<number>
          followChildLast = union(followChildLast, firstNextChild)
          nullableNextChild = self.nullable.get(node.items[suiv].id) as boolean
        } while (suiv < node.items.length - 1 && nullableNextChild)
        self.follow.set(value, followChildLast)
      })
    }
  }

  unionProcessing(node: any) {
    let nullableNode = false
    for (let i = 1; i < node.items.length; i++) {
      const nullableChild = this.nullable.get(node.items[i].id) as boolean
      nullableNode = nullableNode || nullableChild
    }
    this.nullable.set(node.id, nullableNode)

    let firstNode = new Set<number>()
    for (let i = 0; i < node.items.length; i++) {
      const firstChild = this.first.get(node.items[i].id) as Set<number>
      firstNode = union(firstNode, firstChild)
    }
    this.first.set(node.id, firstNode)

    let lastNode = new Set<number>()
    for (let i = 0; i < node.items.length; i++) {
      const lastChild = this.last.get(node.items[i].id) as Set<number>
      lastNode = union(lastNode, lastChild)
    }
    this.last.set(node.id, lastNode)
  }

  oneOrMoreProcessing(node: any) {
    const nullableChild = this.nullable.get(node.items[0].id) as boolean
    this.nullable.set(node.id, nullableChild)
    const firstChild = this.first.get(node.items[0].id) as Set<number>
    this.first.set(node.id, firstChild)
    const lastChild = this.last.get(node.items[0].id) as Set<number>
    this.last.set(node.id, lastChild)

    lastChild.forEach((value: number) => {
      const followLastChild = this.follow.get(value) as Set<number>
      this.follow.set(value, union(followLastChild, firstChild))
    })
  }

  zeroOrOneProcessing(node: any) {
    this.nullable.set(node.id, true)
    const firstChild = this.first.get(node.items[0].id) as Set<number>
    this.first.set(node.id, firstChild)
    const lastChild = this.last.get(node.items[0].id) as Set<number>
    this.last.set(node.id, lastChild)
  }

  zeroOrMoreProcessing(node: any) {
    this.nullable.set(node.id, true)
    const firstChild = this.first.get(node.items[0].id) as Set<number>
    this.first.set(node.id, firstChild)
    const lastChild = this.last.get(node.items[0].id) as Set<number>
    this.last.set(node.id, lastChild)

    lastChild.forEach((value: number) => {
      const followLastChild = this.follow.get(value) as Set<number>
      this.follow.set(value, union(followLastChild, firstChild))
    })
  }

  searchChild(node: any): Set<number> {
    return node.items.reduce((acc: any, n: any) => {
      if (n.pathType === 'symbol') {
        acc.add(n.id)
      } else {
        acc = union(acc, this.searchChild(n))
      }
      return acc
    }, new Set())
  }

  negationProcessing(node: any) {
    const negForward = new Array<rdf.Term>()
    const negBackward = new Array<rdf.Term>()

    this.searchChild(node).forEach((value: number) => {
      const predicatesChild = this.predicates.get(value) as Array<rdf.Term>
      const isReverseChild = this.reverse.get(value) as boolean
      if (isReverseChild) {
        negBackward.push(...predicatesChild)
      } else {
        negForward.push(...predicatesChild)
      }
    })

    const firstNode = new Set<number>()
    const lastNode = new Set<number>()

    if (negForward.length > 0) {
      const id = node.id + 1
      this.nullable.set(id, false)
      this.first.set(id, new Set<number>().add(id))
      this.last.set(id, new Set<number>().add(id))
      this.follow.set(id, new Set<number>())
      this.predicates.set(id, negForward)
      this.reverse.set(id, false)
      this.negation.set(id, true)
      firstNode.add(id)
      lastNode.add(id)
    }
    if (negBackward.length > 0) {
      const id = node.id + 2
      this.nullable.set(id, false)
      this.first.set(id, new Set<number>().add(id))
      this.last.set(id, new Set<number>().add(id))
      this.follow.set(id, new Set<number>())
      this.predicates.set(id, negBackward)
      this.reverse.set(id, true)
      this.negation.set(id, true)
      firstNode.add(id)
      lastNode.add(id)
    }

    this.nullable.set(node.id, false)
    this.first.set(node.id, firstNode)
    this.last.set(node.id, lastNode)
  }

  inverseProcessing(node: any) {
    const nullableChild = this.nullable.get(node.items[0].id) as boolean
    this.nullable.set(node.id, nullableChild)
    const firstChild = this.first.get(node.items[0].id) as Set<number>
    this.last.set(node.id, firstChild)
    const lastChild = this.last.get(node.items[0].id) as Set<number>
    this.first.set(node.id, lastChild)

    const childInverse = this.searchChild(node)

    const followTemp = new Map<number, Set<number>>()
    childInverse.forEach((nodeToReverse: number) => {
      followTemp.set(nodeToReverse, new Set<number>())
    })

    childInverse.forEach((nodeToReverse: number) => {
      const isReverseNodeToReverse = this.reverse.get(nodeToReverse) as boolean
      this.reverse.set(nodeToReverse, !isReverseNodeToReverse)
      const followeesNodeToReverse = this.follow.get(nodeToReverse) as Set<number>
      followeesNodeToReverse.forEach((followee) => {
        if (childInverse.has(followee)) {
          (followTemp.get(followee) as Set<number>).add(nodeToReverse)
          followeesNodeToReverse.delete(followee)
        }
      })
    })

    childInverse.forEach((child) => {
      this.follow.set(
        child,
        union(
          this.follow.get(child) as Set<number>,
          followTemp.get(child) as Set<number>,
        ),
      )
    })
  }

  nodeProcessing(node: any) {
    switch (node.pathType) {
      case 'symbol':
        this.symbolProcessing(node)
        break
      case '/':
        this.sequenceProcessing(node)
        break
      case '|':
        this.unionProcessing(node)
        break
      case '+':
        this.oneOrMoreProcessing(node)
        break
      case '?':
        this.zeroOrOneProcessing(node)
        break
      case '*':
        this.zeroOrMoreProcessing(node)
        break
      case '!':
        this.negationProcessing(node)
        break
      case '^':
        this.inverseProcessing(node)
        break
    }
  }

  treeProcessing(node: any) {
    if (node.pathType !== 'symbol') {
      for (let i = 0; i < node.items.length; i++) {
        this.treeProcessing(node.items[i])
      }
    }
    this.nodeProcessing(node)
  }

  /**
   * Build a Glushkov automaton to evaluate the SPARQL property path
   * @return The Glushkov automaton used to evaluate the SPARQL property path
   */
  build(): Automaton<number, rdf.Term> {
    // Assigns an id to each syntax tree's node. These ids will be used to build and name the automaton's states
    this.postfixNumbering(this.syntaxTree)
    // computation of first, last, follow, nullable, reverse and negation
    this.treeProcessing(this.syntaxTree)

    const glushkov = new Automaton<number, rdf.Term>()
    const root = this.syntaxTree.id // root node identifier

    // Creates and adds the initial state
    const nullableRoot = this.nullable.get(root) as boolean
    const initialState = new State(0, true, nullableRoot)
    glushkov.addState(initialState)

    // Creates and adds the other states
    const lastRoot = this.last.get(root) as Set<number>
    for (const id of Array.from(this.predicates.keys())) {
      const isFinal = lastRoot.has(id)
      glushkov.addState(new State(id, false, isFinal))
    }

    // Adds the transitions that start from the initial state
    const firstRoot = this.first.get(root) as Set<number>
    firstRoot.forEach((value: number) => {
      const toState = glushkov.getState(value)
      const reverse = this.reverse.get(value) as boolean
      const negation = this.negation.get(value) as boolean
      const predicates = this.predicates.get(value) as Array<rdf.Term>
      const transition = new Transition(
        initialState,
        toState,
        reverse,
        negation,
        predicates,
        GlushkovBuilder.predicateTest,
      )
      glushkov.addTransition(transition)
    })

    // Ads the transitions between states
    for (const from of Array.from(this.follow.keys())) {
      const followFrom = this.follow.get(from) as Set<number>
      followFrom.forEach((to: number) => {
        const fromState = glushkov.findState(from) as State<number>
        const toState = glushkov.findState(to) as State<number>
        const reverse = this.reverse.get(to) as boolean
        const negation = this.negation.get(to) as boolean
        const predicates = this.predicates.get(to) as Array<rdf.Term>
        const transition = new Transition(
          fromState,
          toState,
          reverse,
          negation,
          predicates,
          GlushkovBuilder.predicateTest,
        )
        glushkov.addTransition(transition)
      })
    }
    return glushkov
  }
}
