/* file : dataset.ts
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

'use strict'

import Graph from './graph'
import UnionGraph from './union-graph'

/**
 * An abstraction over an RDF datasets, i.e., a collection of RDF graphs.
 * @abstract
 * @author Thomas Minier
 */
export default abstract class Dataset {
  private _graphFactory: (iri: string) => Graph | null;

  /**
   * Constructor
   */
  constructor () {
    this._graphFactory = () => null
  }


  abstract get iris (): string[]
  /**
   * Set the Default Graph of the Dataset
   * @param g - Default Graph
   */
  abstract setDefaultGraph (g: Graph): void

  /**
   * Get the Default Graph of the Dataset
   * @return The Default Graph of the Dataset
   */
  abstract getDefaultGraph (): Graph

  /**
   * Add a Named Graph to the Dataset
   * @param iri - IRI of the Named Graph
   * @param g   - RDF Graph
   */
  abstract addNamedGraph (iri: string, g: Graph): void

  /**
   * Get a Named Graph using its IRI
   * @param  iri - IRI of the Named Graph to retrieve
   * @return The corresponding Named Graph
   */
  abstract getNamedGraph (iri: string): Graph

  /**
   * Return True if the Dataset contains a Named graph with the provided IRI
   * @param  iri - IRI of the Named Graph
   * @return True if the Dataset contains a Named graph with the provided IRI
   */
  abstract hasNamedGraph (iri: string): boolean

  /**
   * Get an UnionGraph, i.e., the dynamic union of several graphs,
   * from the RDF Graphs in the Dataset.
   * @param  iris           - Iris of the named graphs to include in the union
   * @param  includeDefault - True if the default graph should be included
   * @return The dynamic union of several graphs in the Dataset
   */
  getUnionGraph (iris: string[], includeDefault: boolean = false): UnionGraph {
    let graphs: Graph[] = []
    if (includeDefault) {
      graphs.push(this.getDefaultGraph())
    }
    graphs = graphs.concat(iris.map(iri => this.getNamedGraph(iri)))
    return new UnionGraph(graphs)
  }

  /**
   * Returns all Graphs in the Dataset, including the Default one
   * @param  includeDefault - True if the default graph should be included
   * @return The list of all graphs in the Dataset
   */
  getAllGraphs (includeDefault: boolean = true): Graph[] {
    const graphs: Graph[] = []
    if (includeDefault) {
      graphs.push(this.getDefaultGraph())
    }
    this.iris.forEach(iri => {
      graphs.push(this.getNamedGraph(iri))
    })
    return graphs
  }

  /**
   * Set the Graph Factory used by te dataset to create new RDF graphs on-demand
   * @param  factory - Graph Factory
   */
  setGraphFactory (factory: (iri: string) => Graph) {
    this._graphFactory = factory
  }

  /**
   * Create a new RDF Graph, using the current Graph Factory.
   * This Graph factory can be set using the "setGraphFactory" method.
   * @param  iri - IRI of the graph to create
   * @return A new RDF Graph
   */
  createGraph (iri: string): Graph {
    const graph = this._graphFactory(iri)
    if (graph === null) {
      throw new Error(`Impossible to create a new Graph with IRI "${iri}". The RDF dataset does not seems to have a graph factory. Please set it using the "setGraphFactory" method.`)
    }
    return graph!
  }
}
