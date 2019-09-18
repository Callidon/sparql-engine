# sparql-engine
[![Build Status](https://travis-ci.org/Callidon/sparql-engine.svg?branch=master)](https://travis-ci.org/Callidon/sparql-engine)  [![codecov](https://codecov.io/gh/Callidon/sparql-engine/branch/master/graph/badge.svg)](https://codecov.io/gh/Callidon/sparql-engine) [![npm version](https://badge.fury.io/js/sparql-engine.svg)](https://badge.fury.io/js/sparql-engine) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

An open-source framework for building SPARQL query engines in Javascript/Typescript.

[Online documentation](https://callidon.github.io/sparql-engine/)

**Main features**:
* Build a [SPARQL](https://www.w3.org/TR/2013/REC-sparql11-overview-20130321/) query engine on top of any data storage system.
* Supports [the full features of the SPARQL syntax](https://www.w3.org/TR/sparql11-query/) by *implementing a single class!*
* Support for all [SPARQL property Paths](https://www.w3.org/TR/sparql11-query/#propertypaths).
* Implements advanced *SPARQL query rewriting techniques* for transparently optimizing SPARQL query processing.
* Supports [Custom SPARQL functions](#custom-functions).
* Supports the [SPARQL UPDATE protocol](https://www.w3.org/TR/2013/REC-sparql11-update-20130321/).
* Supports Basic [Federated SPARQL queries](https://www.w3.org/TR/2013/REC-sparql11-federated-query-20130321/) using **SERVICE clauses**.
* Customize every step of SPARQL query processing, thanks to *a modular architecture*.

:warning: **In Development** :warning:
* Support for SPARQL Graph Management protocol

# Table of contents
* [Installation](#installation)
* [Getting started](#getting-started)
  * [Examples](#examples)
  * [Preliminaries](#preliminaries)
  * [RDF Graphs](#rdf-graphs)
  * [RDF Datasets](#rdf-datasets)
  * [Running a SPARQL query](#running-a-sparql-query)
* [Federated SPARQL Queries](#federated-sparql-queries)
* [Custom Functions](#custom-functions)
* [Advanced Usage](#advanced-usage)
  * [Customize the pipeline implementation](#customize-the-pipeline-implementation)
  * [Customize query execution](#customize-query-execution)
* [Documentation](#documentation)
* [References](#references)

# Installation

```bash
npm install --save sparql-engine
```

# Getting started

The `sparql-engine` framework allow you to build a custom SPARQL query engine on top of any data storage system.

In short, to support SPARQL queries on top of your data storage system, you need to:
* [Implements a subclass of `Graph`](#rdf-graphs), which provides access to the data storage system.
* Gather all your Graphs as a `Dataset` (using your own implementation or [the default one](#rdf-datasets)).
* [Instantiate a `PlanBuilder`](#running-a-sparql-query) and use it to execute SPARQL queries.

## Examples

As a starting point, we provide you with two examples of integration:
* With [N3.js](https://github.com/rdfjs/N3.js), available [here](https://github.com/Callidon/sparql-engine/tree/master/examples/n3.js).
* With [LevelGraph](https://github.com/levelgraph/levelgraph), available [here](https://github.com/Callidon/sparql-engine/tree/master/examples/levelgraph.js).

## Preliminaries

### RDF triples representation

This framework represents RDF triples using Javascript Object.
You will find below, in Java-like syntax, the "shape" of such object.

```typescript
interface TripleObject {
  subject: string; // The Triple's subject
  predicate: string; // The Triple's predicate
  object: string; // The Triple's object
}
```

### PipelineStage

The `sparql-engine` framework uses a pipeline of iterators to execute SPARQL queries. Thus, many methods encountered in this framework needs to return `PipelineStage<T>`, *i.e.*, objects that generates items of type `T` in a pull-based fashion.

An `PipelineStage<T>` can be easily created from one of the following:
* An **array** of elements of type `T`
* A [**Javascript Iterator**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols), which yields elements of type `T`.
* An [**EventEmitter**](https://nodejs.org/api/events.html#events_class_eventemitter) which emits elements of type `T` on a `data` event.
* A [**Readable stream**](https://nodejs.org/api/stream.html#stream_readable_streams) which produces elements of type `T`.

To create a new `PipelineStage<T>` from one of these objects, you can use the following code:
```javascript
const { Pipeline } = require('sparql-engine')

const sourceObject = // the object to convert into a PipelineStage

const stage = Pipeline.getInstance().from(sourceObject)
```

Fore more information on how to create and manipulate the pipeline, please refers to the documentation of [`Pipeline`](https://callidon.github.io/sparql-engine/classes/pipelinee.html) and [`PipelineEngine`](https://callidon.github.io/sparql-engine/classes/pipelineengine.html).

## RDF Graphs

The first thing to do is to implement a subclass of the `Graph` abstract class. A `Graph` represents an [RDF Graph](https://www.w3.org/TR/rdf11-concepts/#section-rdf-graph) and is responsible for inserting, deleting and searching for RDF triples in the database.

The main method to implement is `Graph.find(triple)`, which is used by the framework to find RDF triples matching
a [triple pattern](https://www.w3.org/TR/sparql11-query/#basicpatterns) in the RDF Graph.
This method must return an `PipelineStage<TripleObject>`, which will be consumed to find matching RDF triples. You can find an **example** of such implementation in the [N3 example](https://github.com/Callidon/sparql-engine/tree/master/examples/n3.js).

Similarly, to support the [SPARQL UPDATE protocol](https://www.w3.org/TR/2013/REC-sparql11-update-20130321/), you have to provides a graph that implements the `Graph.insert(triple)` and `Graph.delete(triple)` methods, which insert and delete RDF triple from the graph, respectively. These methods must returns [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), which are fulfilled when the insertion/deletion operation is completed.

Finally, the `sparql-engine` framework also let your customize how [Basic graph patterns](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#BasicGraphPatterns) (BGPs) are evaluated against
the RDF graph. The engine provides a **default implementation** based on the `Graph.find` method and the
*Index Nested Loop Join algorithm*. However, if you wish to supply your own implementation for BGP evaluation, you just have to implement a `Graph` with an `evalBGP(triples)` method.
This method must return a `PipelineStage<Bindings>`. You can find an example of such implementation in the [LevelGraph example](https://github.com/Callidon/sparql-engine/tree/master/examples/levelgraph.js).

You will find below, in Java-like syntax, an example subclass of a `Graph`.
```typescript
  const { Graph } = require('sparql-engine')

  class CustomGraph extends Graph {
    /**
     * Returns an iterator that finds RDF triples matching a triple pattern in the graph.
     * @param  triple - Triple pattern to find
     * @return An PipelineStage which produces RDF triples matching a triple pattern
     */
    find (triple: TripleObject, options: Object): PipelineStage<TripleObject> { /* ... */ }

    /**
     * Insert a RDF triple into the RDF Graph
     * @param  triple - RDF Triple to insert
     * @return A Promise fulfilled when the insertion has been completed
     */
    insert (triple: TripleObject): Promise { /* ... */ }

    /**
     * Delete a RDF triple from the RDF Graph
     * @param  triple - RDF Triple to delete
     * @return A Promise fulfilled when the deletion has been completed
     */
    delete (triple: : TripleObject): Promise { /* ... */ }
  }
```

## RDF Datasets

Once you have your subclass of `Graph` ready, you need to build a collection of RDF Graphs, called a [RDF Dataset](https://www.w3.org/TR/rdf11-concepts/#section-dataset). A default implementation, `HashMapDataset`, is made available by the framework, but you can build your own by subclassing [`Dataset`](https://callidon.github.io/sparql-engine/classes/dataset.html).

```javascript
 const { HashMapDataset } = require('sparql-engine')
 const CustomGraph = require(/* import your Graph subclass */)

 const GRAPH_A_IRI = 'http://example.org#graph-a'
 const GRAPH_B_IRI = 'http://example.org#graph-b'
 const graph_a = new CustomGraph(/* ... */)
 const graph_b = new CustomGraph(/* ... */)

 // we set graph_a as the Default RDF dataset
 const dataset = new HashMapDataset(GRAPH_A_IRI, graph_a)

 // insert graph_b as a Named Graph
 dataset.addNamedGraph(GRAPH_B_IRI, graph_b)
```

## Running a SPARQL query

Finally, to run a SPARQL query on your RDF dataset, you need to use the `PlanBuilder` class. It is responsible for parsing SPARQL queries and building a pipeline of iterators to evaluate them.

```javascript
  const { PlanBuilder } = require('sparql-engine')

  // Get the name of all people in the Default Graph
  const query = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?name
    WHERE {
      ?s a foaf:Person .
      ?s rdfs:label ?label .
    }`

  // Creates a plan builder for the RDF dataset
  const builder = new PlanBuilder(dataset)

  // Get an iterator to evaluate the query
  const iterator = builder.build(query)

  // Read results
  iterator.subscribe(
    bindings => console.log(bindings),
    err => console.error(err),
    () => console.log('Query evaluation complete!')
  )
```

# Federated SPARQL Queries

The `sparql-engine` framework provides automatic support for evaluating [federated SPARQL queries](https://www.w3.org/TR/2013/REC-sparql11-federated-query-20130321/), using the [`SERVICE` keyword](https://www.w3.org/TR/sparql11-query/#basic-federated-query).

To enable them, you need to set **a Graph Factory** for the RDF dataset used to evaluate SPARQL queries.
This Graph factory is used by the dataset to create new RDF Graph on-demand.
To set it, you need to use the [`Dataset.setGraphFactory`](https://callidon.github.io/sparql-engine/classes/dataset.html#setgraphfactory) method, as detailed below.
It takes *a callback* as parameter, which will be invoked to create a new graph from an IRI.
It's your responsibility to define the graph creation logic, depending on your application.

```typescript
const { HashMapDataset } = require('sparql-engine')
const CustomGraph = require(/* import your Graph subclass */)

const my_graph = new CustomGraph(/* ... */)

const dataset = new HashMapDataset('http://example.org#graph-a', my_graph)

// set the Graph factory of the dataset
dataset.setGraphFactory(iri => {
  // return a new graph for the provided iri
  return new CustomGraph(/* .. */)
})
```

Once the Graph factory is set, you have nothing more to do!
Juste execute your federated SPARQL queries as regular queries, like before!

# Custom Functions

SPARQL allows custom functions in expressions so that queries can be used on domain-specific data.
The `sparql-engine` framework provides a supports for declaring such custom functions.

A SPARQL value function is an extension point of the SPARQL query language that allows URI to name a function in the query processor.
It is defined by an `IRI` in a `FILTER`, `BIND` or `HAVING BY` expression.
To register custom functions, you must create a JSON object that maps each `IRI` to a Javascript function that takes a variable number of [RDFTerms](https://callidon.github.io/sparql-engine/interfaces/terms.rdfterm.html) arguments and returns an `RDFTerm`.
See [the `terms` package documentation](https://callidon.github.io/sparql-engine/modules/terms.html) for more details on how to manipulate RDF terms.

The following shows a declaration of some simple custom functions.
```javascript
// load the utility functions used to manipulate RDF terms
const { terms } = require('sparql-engine')

// define some custom SPARQL functions
const customFunctions = {
  // reverse a RDF literal
  'http://example.com#REVERSE': function (rdfTerm) {
    const reverseValue = rdfTerm.value.split("").reverse().join("")
    return terms.replaceLiteralValue(rdfTerm, reverseValue)
  },
  // Test if a RDF Luteral is a palindrome
  'http://example.com#IS_PALINDROME': function (rdfTerm) {
    const result = rdfTerm.value.split("").reverse().join("") === rdfTerm.value
    return terms.createBoolean(result)
  },
  // Test if a number is even
  'http://example.com#IS_EVEN': function (rdfTerm) {
    if (terms.isNumber(rdfTerm)) {
      const result = rdfTerm.value % 2 === 0
      return terms.createBoolean(result)
    }
    return terms.createBoolean(false)
  }
}
```

Then, this JSON object is passed into the constructor of your PlanBuilder.

```javascript
const builder = new PlanBuilder(dataset, {}, customFunctions)
```

Now, you can execute SPARQL queries with your custom functions!
For example, here is a query that uses our newly defined custom SPARQL functions.

```
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX example: <http://example.com#>
SELECT ?length
WHERE {
  ?s foaf:name ?name .

  # this bind is not critical, but is here for illustrative purposes
  BIND(<http://example.com#REVERSE>(?name) as ?reverse)

  BIND(STRLEN(?reverse) as ?length)

  # only keeps palindromes
  FILTER (!example:IS_PALINDROME(?name))
}
GROUP BY ?length
HAVING (example:IS_EVEN(?length))
```

# Advanced usage

## Customize the pipeline implementation

The class `PipelineEngine` (and its subclasses) is the main component used by `sparql-engine` to evaluate all SPARQL operations. It defines basic operations (`map`, `filter`, etc) that can be used
to manipulate intermediate results and evaluate SPARQL queries.

By default, the framework uses an implementation of `PipelineEngine` based on [`rxjs`](https://rxjs-dev.firebaseapp.com/), to implements a SPARQL query execution plan as a pipeline of iterators.
However, **you are able to switch to others implementations** of `PipelineEngine`, using `Pipeline.setInstance`.

```javascript
const { Pipeline, PipelineEngine } = require('sparql-engine')

class CustomEngine extends PipelineEngine {
  // ...
}

// add this before creating a new plan builder
Pipeline.setInstance(new CustomEngine())
// ...
```

Two implementations of `PipelineEngine` are provided by default.
* `RxjsPipeline`, based on [`rxjs`](https://rxjs-dev.firebaseapp.com/), which provides a pure pipeline approach. This approach is **selected by default** when loading the framework.
* `VectorPipeline`, which materializes all intermediate results at each pipeline computation step. This approach is more efficient CPU-wise, but also consumes a lot more memory.

These implementations can be imported as follows:
```javascript
const { RxjsPipeline, VectorPipeline } = require('sparql-engine')
```

## Customize query execution

A `PlanBuilder` implements a [Builder pattern](https://en.wikipedia.org/wiki/Builder_pattern) in order to create a physical query execution plan for a given SPARQL query.
Internally, it defines [*stages builders*](https://callidon.github.io/sparql-engine/classes/stagebuilder) to generates operators for executing all types of SPARQL operations.
For example, the [`OrderByStageBuilder`](https://callidon.github.io/sparql-engine/classes/orderbystagebuilder.html) is invoked when the `PlanBuilder` needs to evaluate an `ORDER BY` modifier.

If you want to customize how query execution plans are built, you have to implement your own stage builders, by extending existing ones.
Then, you need to configure your plan builder to use them, with the [`use` function](https://callidon.github.io/sparql-engine/classes/planbuilder.html#use).

```javascript
  const { PlanBuilder, stages } = require('sparql-engine')

  class MyOrderByStageBuilder extends stages.OrderByStageBuilder {
    /* Define your custom execution logic for ORDER BY */
  }

  const dataset = /* a RDF dataset */

  // Creates a plan builder for the RDF dataset
  const builder = new PlanBuilder(dataset)

  // Plug-in your custom stage builder
  builder.use(stages.SPARQL_OPERATION.ORDER_BY, MyOrderByStageBuilder(dataset))

  // Now, execute SPARQL queries as before with your PlanBuilder
```

You will find below a reference table of all stage builders used by `sparql-engine` to evaluate SPARQL queries. Please see [the API documentation](https://callidon.github.io/sparql-engine/classes/stagebuilder) for more details.

**Executors**

| SPARQL Operation | Default Stage Builder | Symbol |
|------------------|-----------------------|--------|
| [Aggregates](https://www.w3.org/TR/sparql11-query/#aggregates) | [AggregateStageBuilder](https://callidon.github.io/sparql-engine/classes/aggregatestagebuilder.html) | `SPARQL_OPERATION.AGGREGATE` |
| [Basic Graph Patterns](https://www.w3.org/TR/sparql11-query/#BasicGraphPatterns) | [BGPStageBuilder](https://callidon.github.io/sparql-engine/classes/bgpstagebuilder.html) | `SPARQL_OPERATION.BGP` |
| [BIND](https://www.w3.org/TR/sparql11-query/#bind) | [BindStageBuilder](https://callidon.github.io/sparql-engine/classes/bindstagebuilder.html) | `SPARQL_OPERATION.BIND` |
| [DISTINCT](https://www.w3.org/TR/sparql11-query/#neg-minus) | [DistinctStageBuilder](https://callidon.github.io/sparql-engine/classes/distinctstagebuilder.html) | `SPARQL_OPERATION.DISTINCT` |
| [FILTER](https://www.w3.org/TR/sparql11-query/#expressions) | [FilterStageBuilder](https://callidon.github.io/sparql-engine/classes/filterstagebuilder.html) | `SPARQL_OPERATION.FILTER` |
| [Property Paths](https://www.w3.org/TR/sparql11-query/#propertypaths) | [PathStageBuilder](https://callidon.github.io/sparql-engine/classes/pathstagebuilder.html) | `SPARQL_OPERATION.PROPERTY_PATH` |
| [GRAPH](https://www.w3.org/TR/sparql11-query/#rdfDataset) | [GraphStageBuilder](https://callidon.github.io/sparql-engine/classes/graphstagebuilder.html) | `SPARQL_OPERATION.GRAPH` |
| [MINUS](https://www.w3.org/TR/sparql11-query/#neg-minus) | [MinusStageBuilder](https://callidon.github.io/sparql-engine/classes/minusstagebuilder.html) | `SPARQL_OPERATION.MINUS` |
| [OPTIONAL](https://www.w3.org/TR/sparql11-query/#optionals) | [OptionalStageBuilder](https://callidon.github.io/sparql-engine/classes/optionalstagebuilder.html) | `SPARQL_OPERATION.OPTIONAL` |
| [ORDER_BY](https://www.w3.org/TR/sparql11-query/#modOrderBy) | [OrderByStageBuilder](https://callidon.github.io/sparql-engine/classes/orderbystagebuilder.html) | `SPARQL_OPERATION.ORDER_BY` |
| [SERVICE](https://www.w3.org/TR/sparql11-query/#basic-federated-query) | [ServiceStageBuilder](https://callidon.github.io/sparql-engine/classes/servicestagebuilder.html) | `SPARQL_OPERATION.SERVICE` |
| [UNION](https://www.w3.org/TR/sparql11-query/#alternatives) | [UnionStageBuilder](https://callidon.github.io/sparql-engine/classes/unionstagebuilder.html) | `SPARQL_OPERATION.UNION` |
| [UPDATE](https://www.w3.org/TR/2013/REC-sparql11-update-20130321/) | [UpdateStageBuilder](https://callidon.github.io/sparql-engine/classes/updatestagebuilder.html) | `SPARQL_OPERATION.UPDATE` |


# Documentation

To generate the documentation in the `docs` director:
```bash
git clone https://github.com/Callidon/sparql-engine.git
cd sparql-engine
npm install
npm run doc
```

# References

* [Official W3C RDF specification](https://www.w3.org/TR/rdf11-concepts)
* [Official W3C SPARQL specification](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/)
