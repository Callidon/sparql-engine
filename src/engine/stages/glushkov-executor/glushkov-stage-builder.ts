/* file : glushkov-stage-builder.ts
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

import PathStageBuilder from "../path-stage-builder"
import { Algebra } from "sparqljs"
import Graph from "../../../rdf/graph"
import ExecutionContext from "../../context/execution-context"
import Dataset from "../../../rdf/dataset"
import { Automaton, Transition } from "./automaton"
import { GlushkovBuilder } from "./automatonBuilder"
import { Bindings } from "../../../rdf/bindings"
import { rdf } from "../../../utils"
import { Pipeline } from '../../../engine/pipeline/pipeline'
import { PipelineStage } from '../../../engine/pipeline/pipeline-engine'

/**
 * A Step in the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
class Step {
    private _node: string
    private _state: number

    /**
     * Constructor
     * @param node - The label of a node in the RDF Graph
     * @param state - The ID of a State in the Automaton
     */
    constructor(node: string, state: number) {
        this._node = node
        this._state = state
    }

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
    get node(): string {
        return this._node
    }

    /**
     * Test if the given Step is equal to this Step
     * @param step - Step tested
     * @return True if the Steps are equal, False otherwise
     */
    equals(step: Step): boolean {
        return this.node === step.node && this.state == step.state
    }

    /**
     * Build a clone of this Step
     * @return A copy of this Step
     */
    clone(): Step {
        let copy = new Step(this._node, this._state)
        return copy
    }
}

/**
 * A solution path, found during the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
class ResultPath {
    private _steps: Array<Step>

    /**
     * Constructor
     */
    constructor() {
        this._steps = new Array<Step>()
    }

    /**
     * Add a Step to the ResultPath
     * @param step - New Step to add
     */
    add(step: Step) {
        this._steps.push(step)
    }

    /**
     * Return the last Step of the ResultPath
     * @return The last Step of the ResultPath
     */
    lastStep(): Step {
        return this._steps[this._steps.length - 1]
    }

    /**
     * Return the first Step of the ResultPath
     * @return The first Step of the ResultPath
     */
    firstStep(): Step {
        return this._steps[0]
    }

    /**
     * Test if a Step is already contained in the ResultPath
     * @param step - Step we're looking for in the ResultPath
     * @return True if the given Step is in the ResultPath, False otherwise
     */
    contains(step: Step): boolean {
        return this._steps.findIndex((value: Step) => {
            return value.equals(step)
        }) > -1
    }

    /**
     * Build a clone of this ResultPath
     * @return A copy of this ResultPath
     */
    clone(): ResultPath {
        let copy = new ResultPath()
        this._steps.forEach(function(step) {
            copy.add(step)
        });
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

    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    constructor (dataset: Dataset) {
        super(dataset)
    }

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
    evaluatePropertyPath(rPath: ResultPath, obj: string, graph: Graph, context: ExecutionContext, automaton: Automaton<number, string>, forward: boolean): PipelineStage<Algebra.TripleObject> {
        const engine = Pipeline.getInstance()
        let self = this
        let lastStep: Step = rPath.lastStep()
        let result: PipelineStage<Algebra.TripleObject> = engine.empty()
        if(forward) {
            if(automaton.isFinal(lastStep.state) && (rdf.isVariable(obj) ? true : lastStep.node === obj)) {
                let subject: string = rPath.firstStep().node
                let object: string = rPath.lastStep().node
                result = engine.of({subject: subject, predicate: "", object: object})
            }
        } else {
            if(automaton.isInitial(lastStep.state)) {
                let subject: string = rPath.lastStep().node
                let object: string = rPath.firstStep().node
                result = engine.of({subject: subject, predicate: "", object: object})
            }
        }
        let transitions: Array<Transition<number, string>>
        if(forward) {
            transitions = automaton.getTransitionsFrom(lastStep.state)
        } else {
            transitions = automaton.getTransitionsTo(lastStep.state)
        }
        let obs: PipelineStage<Algebra.TripleObject>[] = transitions.map(function(transition) {
            let reverse = (forward && transition.reverse) || (!forward && !transition.reverse)
            let bgp: Array<Algebra.TripleObject> = [ {
                subject: reverse ? '?o' : lastStep.node,
                predicate: transition.negation ? '?p' : transition.predicates[0],
                object: reverse ? lastStep.node : '?o'
            }]
            return engine.mergeMap(engine.from(graph.evalBGP(bgp, context)), (binding: Bindings) => {
                let p = binding.get('?p')
                let o = binding.get('?o') as string
                if(p != null ? !transition.hasPredicate(p) : true) {
                    let newStep
                    if(forward) {
                        newStep = new Step(o, transition.to.name)
                    } else {
                        newStep = new Step(o, transition.from.name)
                    }
                    if(!rPath.contains(newStep)) {
                        let newPath = rPath.clone()
                        newPath.add(newStep)
                        return self.evaluatePropertyPath(newPath, obj, graph, context, automaton, forward)
                    }
                }
                return engine.empty()
            })
        })
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
    reflexiveClosure(subject: string, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        const engine = Pipeline.getInstance()
        if(rdf.isVariable(subject) && !rdf.isVariable(obj)) {
            let result: Algebra.TripleObject = {subject: obj, predicate: "", object: obj}
            return engine.of(result)
        } else if(!rdf.isVariable(subject) && rdf.isVariable(obj)) {
            let result: Algebra.TripleObject = {subject: subject, predicate: "", object: subject}
            return engine.of(result)
        } else if(rdf.isVariable(subject) && rdf.isVariable(obj)) {
            let bgp: Array<Algebra.TripleObject> = [ {subject: '?s', predicate: '?p', object: '?o'}]
            return engine.distinct(
                engine.mergeMap(engine.from(graph.evalBGP(bgp, context)), (binding: Bindings) => {
                    let s = binding.get('?s') as string
                    let o = binding.get('?o') as string
                    let t1: Algebra.TripleObject = {subject: s, predicate: "", object: s}
                    let t2: Algebra.TripleObject = {subject: o, predicate: "", object: o}
                    return engine.of(t1, t2)
            }), (triple: Algebra.TripleObject) => triple.subject)
        }
        if(subject === obj) {
            let result: Algebra.TripleObject = {subject: subject, predicate: "", object: obj}
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
    startPropertyPathEvaluation(subject: string, obj: string, graph: Graph, context: ExecutionContext, automaton: Automaton<number, string>, forward: boolean): PipelineStage<Algebra.TripleObject> {
        const engine = Pipeline.getInstance()
        let self = this
        let reflexiveClosureResults: PipelineStage<Algebra.TripleObject> = automaton.isFinal(0) ? this.reflexiveClosure(subject, obj, graph, context) : engine.empty()
        let transitions: Array<Transition<number, string>>
        if(forward) {
            transitions = automaton.getTransitionsFrom(0)
        } else {
            transitions = automaton.getTransitionsToFinalStates()
        }
        let obs: PipelineStage<Algebra.TripleObject>[] = transitions.map(function(transition) {
            let reverse = (forward && transition.reverse) || (!forward && !transition.reverse)
            let bgp: Array<Algebra.TripleObject> = [ {
                subject: reverse ? '?o' : subject,
                predicate: transition.negation ? '?p' : transition.predicates[0],
                object: reverse ? subject : '?o'
            }]
            return engine.mergeMap(engine.from(graph.evalBGP(bgp, context)), (binding: Bindings) => {
                let s = (rdf.isVariable(subject) ? binding.get(subject) : subject) as string
                let p = binding.get('?p')
                let o = binding.get('?o') as string
                if(p != null ? !transition.hasPredicate(p) : true) {
                    let path = new ResultPath()
                    if(forward) {
                        path.add(new Step(s, transition.from.name))
                        path.add(new Step(o, transition.to.name))
                    } else {
                        path.add(new Step(s, transition.to.name))
                        path.add(new Step(o, transition.from.name))
                    }
                    return self.evaluatePropertyPath(path, obj, graph, context, automaton, forward)
                }
                return engine.empty()
            })
        })
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
    _executePropertyPath(subject: string, path: Algebra.PropertyPath, obj: string, graph: Graph, context: ExecutionContext): PipelineStage<Algebra.TripleObject> {
        let automaton: Automaton<number, string> = new GlushkovBuilder(path).build()
        if(rdf.isVariable(subject) && !rdf.isVariable(obj)) {
            return this.startPropertyPathEvaluation(obj, subject, graph, context, automaton, false)
        } else {
            return this.startPropertyPathEvaluation(subject, obj, graph, context, automaton, true)
        }
    }
}
