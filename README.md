# sparql-engine
[![Build Status](https://travis-ci.org/Callidon/sparql-engine.svg?branch=master)](https://travis-ci.org/Callidon/sparql-engine)  [![codecov](https://codecov.io/gh/Callidon/sparql-engine/branch/master/graph/badge.svg)](https://codecov.io/gh/Callidon/sparql-engine) [![npm version](https://badge.fury.io/js/sparql-engine.svg)](https://badge.fury.io/js/sparql-engine) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

An open-source framework for building SPARQL query engines in Javascript.

[Online documentation](https://callidon.github.io/sparql-engine/)

**Main features**:
* Build a [SPARQL](https://www.w3.org/TR/2013/REC-sparql11-overview-20130321/) query engine on top of any data storage system.
* Supports [the full features of the SPARQL syntax](https://www.w3.org/TR/sparql11-query/) by *implementing a single class!*
* Implements advanced *SPARQL query rewriting techniques* for transparently optimizing SPARQL query processing.
* Supports [Custom SPARQL functions](#custom-functions).
* Supports the [SPARQL UPDATE protocol](https://www.w3.org/TR/2013/REC-sparql11-update-20130321/).
* Supports Basic [Federated SPARQL queries](https://www.w3.org/TR/2013/REC-sparql11-federated-query-20130321/) using **SERVICE clauses**.
* Customize every step of SPARQL query processing, thanks to a component-based architecture.

:warning: **In Development** :warning:
* Support for all SPARQL property Paths.
* Support for SPARQL Graph Management protocol

# Table of contents
* [Installation](#installation)
* [Getting started](#getting-started)
  * [Examples](#examples)
  * [Preliminaries](#preliminaries)
  * [RDF Graphs](#rdf-graphs)
  * [RDF Datasets](#rdf-datasets)
  * [Running a SPARQL query](#running-a-sparql-query)
* [Custom Functions](#custom-functions)
* [Federated SPARQL Queries](#federated-sparql-queries)
* [Advanced Usage](#advanced-usage)
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

### Observable

The `sparql-engine` framework uses a pipeline of iterators to execute SPARQL queries. Thus, many methods encountered in this framework needs to return `Observable<T>`, *i.e.*, objects that generates items of type `T` in a push-based fashion.
An `Observable<T>` can be one of the following:
* An **array** of elements of type `T`
* A [**Javascript Iterator**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols), which yields elements of type `T`.
* An [**EventEmitter**](https://nodejs.org/api/events.html#events_class_eventemitter) which emits elements of type `T` on a `data` event.
* A [**Readable stream**](https://nodejs.org/api/stream.html#stream_readable_streams) which produces elements of type `T`.

```typescript
type Observable<T> = Array<T> | Iterator<T> | EventEmitter<T> | Readable<T>;
```

Internally, we use the [`rxjs`](https://rxjs-dev.firebaseapp.com) package for handling pipeline of iterators.

## RDF Graphs

The first thing to do is to implement a subclass of the `Graph` abstract class. A `Graph` represents an [RDF Graph](https://www.w3.org/TR/rdf11-concepts/#section-rdf-graph) and is responsible for inserting, deleting and searching for RDF triples in the database.

The main method to implement is `Graph.find(triple)`, which is used by the framework to find RDF triples matching
a [triple pattern](https://www.w3.org/TR/sparql11-query/#basicpatterns) in the RDF Graph.
This method must return an `Observable<TripleObject>`, which will be consumed to find matching RDF triples. You can find an **example** of such implementation in the [N3 example](https://github.com/Callidon/sparql-engine/tree/master/examples/n3.js).

Similarly, to support the [SPARQL UPDATE protocol](https://www.w3.org/TR/2013/REC-sparql11-update-20130321/), you have to provides a graph that implements the `Graph.insert(triple)` and `Graph.delete(triple)` methods, which insert and delete RDF triple from the graph, respectively. These methods must returns [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), which are fulfilled when the insertion/deletion operation is completed.

Finally, the `sparql-engine` framework also let your customize how [Basic graph patterns](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#BasicGraphPatterns) (BGPs) are evaluated against
the RDF graph. The engine provides a **default implementation** based on the `Graph.find` method and the
*Index Nested Loop Join algorithm*. However, if you wish to supply your own implementation for BGP evaluation, you just have to implement a `Graph` with an `evalBGP(triples)` method.
This method must return a `Observable<Bindings>`. You can find an example of such implementation in the [LevelGraph example](https://github.com/Callidon/sparql-engine/tree/master/examples/levelgraph.js).

You will find below, in Java-like syntax, an example subclass of a `Graph`.
```typescript
  const { Graph } = require('sparql-engine')

  class CustomGraph extends Graph {
    /**
     * Returns an iterator that finds RDF triples matching a triple pattern in the graph.
     * @param  triple - Triple pattern to find
     * @return An observable which finds RDF triples matching a triple pattern
     */
    find (triple: TripleObject, options: Object): Observable<TripleObject> { /* ... */ }

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

Once you have your subclass of `Graph` ready, you need to build a collection of RDF Graphs, called a [RDF Dataset](https://www.w3.org/TR/rdf11-concepts/#section-dataset). A default implementation, `HashMapDataset`, is made available by the framework, but you can build your own by subclassing [`Dataset`](https://github.com/Callidon/sparql-engine/blob/master/src/rdf/dataset.js).

```javascript
 const { HashMapDataset } = require('sparql-engine')
 const CustomGraph = // import your Graph subclass

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

# Federated SPARQL Queries

The `sparql-engine` framework provides support for evaluating [federated SPARQL queries](https://www.w3.org/TR/2013/REC-sparql11-federated-query-20130321/), using the **SERVICE keyword**.
As with a `Graph`, you simply need to provides an implementation of a [`ServiceExecutor`](https://github.com/Callidon/sparql-engine/blob/master/src/engine/executors/service-executor.js), a class used as a building block by the engine to evaluates SERVICE clauses.
The only method that needs to be implemented is the `ServiceExecutor._execute` method,
as detailed below.

```typescript
const { ServiceExecutor } = require('sparql-engine')

class MyServiceExecutor extends ServiceExecutor {
  /**
   * Constructor
   * @param builder - PlanBuilder instance
   */
  constructor (builder: PlanBuilder) {}

  /**
   * Returns an iterator used to evaluate a SERVICE clause
   * @param  source    - Source observable
   * @param  iri       - Iri of the SERVICE clause
   * @param  subquery  - Subquery to be evaluated
   * @param  options   - Execution options
   * @return An observable used to evaluate a SERVICE clause
   */
  _execute (source: Observable<Bindings>, iri: string, subquery: Object, options: Object): Observable<Bindings> { /* ... */}
}
```

Once your custom ServiceExecutor is ready, you need to *install* it on a `PlanBuilder` instance.
```javascript
  const { ServiceExecutor } = require('sparql-engine')
  // Suppose a custom ServiceExecutor
  class CustomServiceExecutor extends ServiceExecutor { /* ... */ }

  const builder = new PlanBuilder()
  builder.serviceExecutor = new CustomServiceExecutor(builder)

  // Then, use the builder as usual to evaluate Federated SPARQL queries
  const iterator = builder.build(/* ... */)
  // ...
```

# Advanced usage

## Building the Physical Query Execution Plan yourself

As introduced before, a `PlanBuilder` rely on **Executors** to build the *physical query execution plan*
of a SPARQL query. If you wish to configure how this plan is built, then you just have to extends the various executors
available. The following table gives you all informations needed about the available executors.

**Executors**

| Base class | Used to handle | PlanBuilder setter |
|------------|----------------|--------------------|
| [BGPExecutor](https://github.com/Callidon/sparql-engine/blob/master/src/engine/executors/bgp-executor.js) | [Basic Graph Patterns](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#BasicGraphPatterns) | `builder.bgpExecutor = ...` |
| [GraphExecutor](https://github.com/Callidon/sparql-engine/blob/master/src/engine/executors/graph-executor.js) | [SPARQL GRAPH](https://www.w3.org/TR/sparql11-query/#queryDataset) | `builder.graphExecutor = ...` |
| [ServiceExecutor](https://github.com/Callidon/sparql-engine/blob/master/src/engine/executors/service-executor.js) | [SPARQL Service](https://www.w3.org/TR/2013/REC-sparql11-federated-query-20130321/) | `builder.serviceExecutor = ...` |
| [AggregateExecutor](https://github.com/Callidon/sparql-engine/blob/master/src/engine/executors/aggregate-executor.js) | [SPARQL Aggregates](https://www.w3.org/TR/sparql11-query/#aggregates) | `builder.aggregateExecutor = ...` |
| [UpdateExecutor](https://github.com/Callidon/sparql-engine/blob/master/src/engine/executors/update-executor.js) | [SPARQL UPDATE protocol](https://www.w3.org/TR/2013/REC-sparql11-update-20130321/) | `builder.updateExecutor = ...` |

The following example show you how to install your custom executors on a `PlanBuilder` instance.
```javascript
  const { BGPExecutor } = require('sparql-engine')
  // Suppose a custom BGPExecutor
  class CustomBGPExecutor extends BGPExecutor { /* ... */ }

  const builder = new PlanBuilder()
  builder.bgpExecutor = new CustomBGPExecutor()

  // Then, use the builder as usual to evaluate SPARQL queries
  const iterator = builder.build(/* ... */)
  // ...
```

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
