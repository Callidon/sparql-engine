/* file : glushkov-stage-builder.ts
MIT License

Copyright (c) 2019 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import * as SPARQL from 'sparqljs'
import { PipelineStage } from '../../../engine/pipeline/pipeline-engine.js'
import { Pipeline } from '../../../engine/pipeline/pipeline.js'
import { Bindings } from '../../../rdf/bindings.js'
import Graph from '../../../rdf/graph.js'
import { rdf, sparql } from '../../../utils/index.js'
import ExecutionContext from '../../context/execution-context.js'
import PathStageBuilder from '../path-stage-builder.js'
import { Automaton, Transition } from './automaton.js'
import { GlushkovBuilder } from './automatonBuilder.js'

/**
 * A Step in the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
class Step<T> {
  /**
   * Constructor
   * @param node - The label of a node in the RDF Graph
   * @param state - The ID of a State in the Automaton
   */
  constructor(
    private _node: T,
    private _state: number,
    private _isEqual: (a: T, b: T) => boolean,
  ) {}

  /**
   * Get the Automaton's state associated with this Step of the ResultPath
   * @return The Automaton's state associated with this Step
   */
  get state(): number {
    return this._state
  }

  /**
   * Get the RDF Graph's node associated with this Step of the ResultPath
   * @return The RDF Graph's node associated with this Step
   */
  get node(): T {
    return this._node
  }

  /**
   * Test if the given Step is equal to this Step
   * @param step - Step tested
   * @return True if the Steps are equal, False otherwise
   */
  equals(step: Step<T>): boolean {
    return this._isEqual(this.node, step.node) && this.state === step.state
  }

  /**
   * Build a clone of this Step
   * @return A copy of this Step
   */
  clone(): Step<T> {
    const copy = new Step<T>(this._node, this._state, this._isEqual)
    return copy
  }
}

/**
 * A solution path, found during the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
class ResultPath<T> {
  private _steps: Array<Step<T>>

  /**
   * Constructor
   */
  constructor() {
    this._steps = new Array<Step<T>>()
  }

  /**
   * Add a Step to the ResultPath
   * @param step - New Step to add
   */
  add(step: Step<T>) {
    this._steps.push(step)
  }

  /**
   * Return the last Step of the ResultPath
   * @return The last Step of the ResultPath
   */
  lastStep(): Step<T> {
    return this._steps[this._steps.length - 1]
  }

  /**
   * Return the first Step of the ResultPath
   * @return The first Step of the ResultPath
   */
  firstStep(): Step<T> {
    return this._steps[0]
  }

  /**
   * Test if a Step is already contained in the ResultPath
   * @param step - Step we're looking for in the ResultPath
   * @return True if the given Step is in the ResultPath, False otherwise
   */
  contains(step: Step<T>): boolean {
    return (
      this._steps.findIndex((value: Step<T>) => {
        return value.equals(step)
      }) > -1
    )
  }

  /**
   * Build a clone of this ResultPath
   * @return A copy of this ResultPath
   */
  clone(): ResultPath<T> {
    const copy = new ResultPath<T>()
    this._steps.forEach((step) => {
      copy.add(step)
    })
    return copy
  }
}

/**
 * A GlushkovStageBuilder is responsible for evaluation a SPARQL property path query using a Glushkov state automata.
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
export default class GlushkovStageBuilder extends PathStageBuilder {
  private subjectVariable = rdf.createVariable('?s')
  private predicateVariable = rdf.createVariable('?p')
  private objectVariable = rdf.createVariable('?o')

  private tempVariable = rdf.createVariable('?temp')

  private isEqualTerms = (a: rdf.Term, b: rdf.Term) => a.equals(b)

  /**
   * Continues the execution of the SPARQL property path and builds the result's paths
   * @param rPath - Path being processed
   * @param obj - Path object
   * @param graph - RDF graph
   * @param context - Execution context
   * @param automaton - Automaton used to evaluate the SPARQL property path
   * @param forward - if True the walk proceeds through outgoing edges, otherwise the walk proceeds in reverse direction
   * @return An Observable which yield RDF triples matching the property path
   */
  evaluatePropertyPath(
    rPath: ResultPath<sparql.UnBoundedTripleValue>,
    obj: sparql.PropertyPathTriple['object'],
    graph: Graph,
    context: ExecutionContext,
    automaton: Automaton<number, rdf.Term>,
    forward: boolean,
  ): PipelineStage<SPARQL.Triple> {
    const engine = Pipeline.getInstance()
    const lastStep = rPath.lastStep()
    let result: PipelineStage<SPARQL.Triple> = engine.empty()
    if (forward) {
      if (
        automaton.isFinal(lastStep.state) &&
        (rdf.isVariable(obj) ? true : lastStep.node === obj)
      ) {
        const subject = rPath.firstStep()
          .node as sparql.PropertyPathTriple['subject']
        const object = rPath.lastStep().node
        result = engine.of({ subject, predicate: this.tempVariable, object })
      }
    } else {
      if (automaton.isInitial(lastStep.state)) {
        const subject = rPath.lastStep()
          .node as sparql.PropertyPathTriple['subject']
        const object = rPath.firstStep().node
        result = engine.of({ subject, predicate: this.tempVariable, object })
      }
    }
    let transitions: Array<Transition<number, rdf.Term>>
    if (forward) {
      transitions = automaton.getTransitionsFrom(lastStep.state)
    } else {
      transitions = automaton.getTransitionsTo(lastStep.state)
    }
    const obs: PipelineStage<SPARQL.Triple>[] = transitions.map(
      (transition) => {
        const reverse =
          (forward && transition.reverse) || (!forward && !transition.reverse)
        const bgp: Array<SPARQL.Triple> = [
          {
            subject: reverse
              ? this.objectVariable
              : (lastStep.node as sparql.PropertyPathTriple['subject']),
            predicate: transition.negation
              ? this.predicateVariable
              : (transition.predicates[0] as sparql.NoPathTriple['predicate']),
            object: reverse ? lastStep.node : this.objectVariable,
          },
        ]
        return engine.mergeMap(
          engine.from(graph.evalBGP(bgp, context)),
          (binding: Bindings) => {
            const p = binding.get(this.predicateVariable)
            const o = binding.get(this.objectVariable)!
            if (p !== null ? !transition.hasPredicate(p) : true) {
              let newStep
              if (forward) {
                newStep = new Step(o, transition.to.name, this.isEqualTerms)
              } else {
                newStep = new Step(o, transition.from.name, this.isEqualTerms)
              }
              if (!rPath.contains(newStep)) {
                const newPath = rPath.clone()
                newPath.add(newStep)
                return this.evaluatePropertyPath(
                  newPath,
                  obj,
                  graph,
                  context,
                  automaton,
                  forward,
                )
              }
            }
            return engine.empty()
          },
        )
      },
    )
    return engine.merge(...obs, result)
  }

  /**
   * Execute a reflexive closure against a RDF Graph.
   * @param subject - Path subject
   * @param obj - Path object
   * @param graph - RDF graph
   * @param context - Execution context
   * @return An Observable which yield RDF triples retrieved after the evaluation of the reflexive closure
   */
  reflexiveClosure(
    subject: rdf.Term,
    obj: rdf.Term,
    graph: Graph,
    context: ExecutionContext,
  ): PipelineStage<SPARQL.Triple> {
    const engine = Pipeline.getInstance()
    if (rdf.isVariable(subject) && !rdf.isVariable(obj)) {
      const result: SPARQL.Triple = {
        subject: obj as SPARQL.Triple['subject'],
        predicate: this.tempVariable,
        object: obj,
      }
      return engine.of(result)
    } else if (!rdf.isVariable(subject) && rdf.isVariable(obj)) {
      const result: SPARQL.Triple = {
        subject: subject as SPARQL.Triple['subject'],
        predicate: this.tempVariable,
        object: subject,
      }
      return engine.of(result)
    } else if (rdf.isVariable(subject) && rdf.isVariable(obj)) {
      const bgp: Array<SPARQL.Triple> = [
        {
          subject: this.subjectVariable,
          predicate: this.predicateVariable,
          object: this.objectVariable,
        },
      ]
      return engine.distinct(
        engine.mergeMap(
          engine.from(graph.evalBGP(bgp, context)),
          (binding: Bindings) => {
            const s = binding.get(
              this.subjectVariable,
            ) as SPARQL.Triple['subject']
            const o = binding.get(
              this.objectVariable,
            ) as SPARQL.Triple['subject']
            const t1: SPARQL.Triple = {
              subject: s,
              predicate: this.tempVariable,
              object: s,
            }
            const t2: SPARQL.Triple = {
              subject: o,
              predicate: this.tempVariable,
              object: o,
            }
            return engine.of(t1, t2)
          },
        ),
        (triple: SPARQL.Triple) => triple.subject,
      )
    }
    if (subject === obj) {
      const result: SPARQL.Triple = {
        subject: subject as SPARQL.Triple['subject'],
        predicate: this.tempVariable,
        object: obj,
      }
      return engine.of(result)
    }
    return engine.empty()
  }

  /**
   * Starts the execution of a property path against a RDF Graph.
   * - executes the reflexive closure if the path expression contains the empty word
   * - builds the first step of the result's paths
   * @param subject - Path subject
   * @param obj - Path object
   * @param graph - RDF graph
   * @param context - Execution context
   * @param automaton - Automaton used to evaluate the SPARQL property path
   * @param forward - if True the walk starts from the subject, otherwise the walk starts from the object
   * @return An Observable which yield RDF triples matching the property path
   */
  startPropertyPathEvaluation(
    subject: sparql.UnBoundedTripleValue,
    obj: sparql.UnBoundedTripleValue,
    graph: Graph,
    context: ExecutionContext,
    automaton: Automaton<number, rdf.Term>,
    forward: boolean,
  ): PipelineStage<SPARQL.Triple> {
    const engine = Pipeline.getInstance()
    const reflexiveClosureResults: PipelineStage<SPARQL.Triple> =
      automaton.isFinal(0)
        ? this.reflexiveClosure(subject, obj, graph, context)
        : engine.empty()
    let transitions: Array<Transition<number, rdf.Term>>
    if (forward) {
      transitions = automaton.getTransitionsFrom(0)
    } else {
      transitions = automaton.getTransitionsToFinalStates()
    }
    const obs: PipelineStage<SPARQL.Triple>[] = transitions.map(
      (transition) => {
        const reverse =
          (forward && transition.reverse) || (!forward && !transition.reverse)
        const bgp: Array<SPARQL.Triple> = [
          sparql.createLooseTriple(
            reverse
              ? rdf.isVariable(obj)
                ? this.objectVariable
                : obj
              : subject,
            transition.negation
              ? this.predicateVariable
              : transition.predicates[0],
            reverse ? subject : rdf.isVariable(obj) ? this.objectVariable : obj,
          ),
        ]

        return engine.mergeMap(
          engine.from(graph.evalBGP(bgp, context)),
          (binding: Bindings) => {
            const s = rdf.isVariable(subject) ? binding.get(subject)! : subject
            const p = binding.get(this.predicateVariable)
            const o = rdf.isVariable(obj)
              ? binding.get(this.objectVariable)!
              : obj

            if (p !== null ? !transition.hasPredicate(p) : true) {
              const path = new ResultPath<sparql.UnBoundedTripleValue>()
              if (forward) {
                path.add(
                  new Step<sparql.UnBoundedTripleValue>(
                    s,
                    transition.from.name,
                    this.isEqualTerms,
                  ),
                )
                path.add(
                  new Step<sparql.UnBoundedTripleValue>(
                    o,
                    transition.to.name,
                    this.isEqualTerms,
                  ),
                )
              } else {
                path.add(
                  new Step<sparql.UnBoundedTripleValue>(
                    s,
                    transition.to.name,
                    this.isEqualTerms,
                  ),
                )
                path.add(
                  new Step<sparql.UnBoundedTripleValue>(
                    o,
                    transition.from.name,
                    this.isEqualTerms,
                  ),
                )
              }
              return this.evaluatePropertyPath(
                path,
                obj,
                graph,
                context,
                automaton,
                forward,
              )
            }
            return engine.empty()
          },
        )
      },
    )
    return engine.merge(...obs, reflexiveClosureResults)
  }

  /**
   * Execute a property path against a RDF Graph.
   * @param  subject - Path subject
   * @param  path  - Property path
   * @param  obj   - Path object
   * @param  graph - RDF graph
   * @param  context - Execution context
   * @return An Observable which yield RDF triples matching the property path
   */
  _executePropertyPath(
    subject: sparql.PropertyPathTriple['subject'],
    path: sparql.PropertyPathTriple['predicate'],
    obj: sparql.PropertyPathTriple['object'],
    graph: Graph,
    context: ExecutionContext,
  ): PipelineStage<SPARQL.Triple> {
    const automaton: Automaton<number, rdf.Term> = new GlushkovBuilder(
      path,
    ).build()
    if (rdf.isVariable(subject) && !rdf.isVariable(obj)) {
      return this.startPropertyPathEvaluation(
        obj,
        subject,
        graph,
        context,
        automaton,
        false,
      )
    } else {
      return this.startPropertyPathEvaluation(
        subject,
        obj,
        graph,
        context,
        automaton,
        true,
      )
    }
  }
}
