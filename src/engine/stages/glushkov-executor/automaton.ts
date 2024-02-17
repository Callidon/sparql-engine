/* file : automaton.ts
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

/**
 * A state of the automaton
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
export class State<T> {
  /**
   * Constructor
   * @param name - Name of the State. Must be unique.
   * @param isInitial - True to construct an initial State, False otherwise
   * @param isFinal - True to construct a final State, False otherwise
   */
  constructor(
    private _name: T,
    private _isInitial: boolean,
    private _isFinal: boolean,
  ) {}

  /**
   * Get the name of the State
   * @return The name of the State
   */
  get name(): T {
    return this._name
  }

  /**
   * Get the flag that indicates whether the state is an initial state
   * @return True if the State is an initial State, False otherwise
   */
  get isInitial(): boolean {
    return this._isInitial
  }

  /**
   * Get the flag that indicates whether the state is a final state
   * @return True if the State is a final State, False otherwise
   */
  get isFinal(): boolean {
    return this._isFinal
  }

  /**
   * Test if a name is equal to the name of the State
   * @param name - Name tested
   * @return True if the given name is equal to the name of the State, False otherwise
   */
  hasName(name: T): boolean {
    return this.name === name
  }

  /**
   * Test if a State is equal to this State
   * i.e. All the fields of the State are equal to those of this State
   * @param state - State tested
   * @return True if the States are equal, False otherwise
   */
  equals(state: State<T>): boolean {
    return (
      this.name === state.name &&
      this._isInitial === state._isInitial &&
      this._isFinal === state.isFinal
    )
  }

  toString(): string {
    return `State = {name: ${this.name}, isFinal: ${this.isFinal}}`
  }
}

/**
 * A transition of the automaton
 */
export class Transition<T, P> {
  /**
   * Constructor
   * @param from - State from which the transition starts
   * @param to - State to which the transition arrives
   * @param reverse - True if to go throught this transiton, we have to look for an incoming edge in the RDF graph,
   *                  False if to go throught this transition, we have to look for an outgoing edge in the RDF graph
   * @param negation - True if to go throught this transition, we have to look for an edge for which the label must be in the predicates array,
   *                   False if to go throught this transition, we have to look for an edge for which the label musn't be in the predicates array
   * @param predicates
   */
  constructor(
    private _from: State<T>,
    private _to: State<T>,
    private _reverse: boolean,
    private _negation: boolean,
    //FIXME change to termSet
    private _predicates: Array<P>,
    private _hasFunction: (current: Array<P>, toTest: P) => boolean,
  ) {}

  /**
   * Get the State from which the transition starts
   * @return The State from which the transition starts
   */
  get from() {
    return this._from
  }

  /**
   * Get the State to which the transition arrives
   * @return The State to which the transition arrives
   */
  get to() {
    return this._to
  }

  /**
   * Get the predicates
   * @return if negation == False then an array of length 1, else an array of length 1 or more
   */
  get predicates(): Array<P> {
    return this._predicates
  }

  /**
   * Get the flag which indicates whether we have to look for an outgoing or an incoming edge in the RDF graph
   * @return The flag which indicates whether we have to look for an outgoing or an incoming edge in the RDF graph
   */
  get reverse(): boolean {
    return this._reverse
  }

  /**
   * Get the flag which indicates whether the edge's label must or musn't be in the predicates array
   * @return The flag which indicates whether the edge's label must or musn't be in the predicates array
   */
  get negation(): boolean {
    return this._negation
  }

  hasPredicate(predicate: P) {
    return this._hasFunction(this.predicates, predicate)
  }

  /**
   * Test if a Transition is equal to this Transition
   * i.e. All the fields of the Transition are equal to those of this Transition
   * @param transition - Transition tested
   * @return True if the Transitions are equal, False otherwise
   */
  equals(transition: Transition<T, P>): boolean {
    return (
      this.from === transition.from &&
      this.to === transition.to &&
      this.reverse === transition.reverse &&
      this.negation === transition.negation &&
      this.predicates === transition.predicates
    )
  }

  toString(): string {
    let result = `Transition = {\n\t
        from: ${this.from.toString()},\n\t
        to: ${this.to.toString()},\n\t
        reverse: ${this.reverse},\n\t
        negation: ${this.negation},\n\t`
    const upper = this.predicates.length - 1
    this.predicates.forEach((pred, index) => {
      if (index === 0) {
        result += ',\n\t\tpredicates: [\n'
      }
      if (index < upper) {
        result += `\t\t\t${pred},\n`
      } else {
        result += `\t\t\t${pred}\n\t\t]`
      }
    })
    result += '\n\t}'
    return result
  }
}

/**
 * An Automaton is used to evaluate a SPARQL Property Path. SPARQL Property Paths are transformed into an
 * equivalent Automaton which are used as a guide to navigate throught the Graph. When we reach a final state
 * then we have found a Path in the Graph that matches the Property Path.
 */
export class Automaton<T, P> {
  private states: Array<State<T>>
  private transitions: Array<Transition<T, P>>

  /**
   * Constructor
   */
  constructor() {
    this.states = new Array<State<T>>()
    this.transitions = new Array<Transition<T, P>>()
  }

  /**
   * Return the State with the given name
   * @param name - Name of the State we're looking for
   * @return A State if there is a State with the given name, null otherwise
   */
  findState(name: T): State<T> | null {
    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i].hasName(name)) {
        return this.states[i]
      }
    }
    return null
  }

  /**
   * Return the State with the given name
   * @param name - Name of the State we know exists
   * @return A State if there is a State with the given name, throw otherwise
   */
  getState(name: T): State<T> {
    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i].hasName(name)) {
        return this.states[i]
      }
    }
    throw new Error(`State with name ${name} doesn't exist`)
  }

  /**
   * Add a State to the Automaton
   * @param state - State to be added
   */
  addState(state: State<T>) {
    this.states.push(state)
  }

  /**
   * Add a Transition to the Automaton
   * @param transition - Transition to be added
   */
  addTransition(transition: Transition<T, P>) {
    this.transitions.push(transition)
  }

  /**
   * Return the Transitions which start from the given State
   * @param from - State from which the Transitions we are looking for must start
   * @return Transitions which start from the given State
   */
  getTransitionsFrom(from: T): Array<Transition<T, P>> {
    return this.transitions.filter((transition: Transition<T, P>) => {
      return transition.from.hasName(from)
    })
  }

  /**
   * Return the Transitions which arrives to the given State
   * @param to - State to which the Transitions we are looking for must arrive
   * @return Transitions which arrives to the given State
   */
  getTransitionsTo(to: T): Array<Transition<T, P>> {
    return this.transitions.filter((transition: Transition<T, P>) => {
      return transition.to.hasName(to)
    })
  }

  /**
   * Return the Transitions which arrives to a final State
   * @return Transitions which arrives to a final State
   */
  getTransitionsToFinalStates(): Array<Transition<T, P>> {
    const transitions: Array<Transition<T, P>> = []
    const finalStates = this.states.filter((state: State<T>) => {
      return state.isFinal
    })
    finalStates.forEach((state: State<T>) => {
      transitions.push(...this.getTransitionsTo(state.name))
    })
    return transitions
  }

  /**
   * Test if the State with the given name is an initial State
   * @param stateName - Name of the tested State
   * @return True if the State is an initial State, False otherwise
   */
  isInitial(stateName: T): boolean {
    const state: State<T> | null = this.findState(stateName)
    if (state !== null) {
      return state.isInitial
    }
    return false
  }

  /**
   * Test if the State with the given name is a final State
   * @param stateName - Name of the tested State
   * @return True if the State is a final State, False otherwise
   */
  isFinal(stateName: T): boolean {
    const state: State<T> | null = this.findState(stateName)
    if (state !== null) {
      return state.isFinal
    }
    return false
  }

  toString(): string {
    let result: string = '\n============ Automate ============\n'
    result += '\nETATS:\n\n'
    this.states.forEach((state) => {
      result += `${state.toString()}\n`
    })
    result += '\nTRANSITIONS:\n\n'
    this.transitions.forEach((transition) => {
      result += `${transition.toString()}\n`
    })
    result += '\n============ Automate ============\n'
    return result
  }
}
