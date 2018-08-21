# sparql-engine
[![Build Status](https://travis-ci.org/Callidon/sparql-engine.svg?branch=master)](https://travis-ci.org/Callidon/sparql-engine)

An open-source framework for building SPARQL query engines in Javascript.

**Main features**:
* Build a [SPARQL](https://www.w3.org/TR/2013/REC-sparql11-overview-20130321/) query engine on top of any data storage system.
* Support [the full features of the SPARQL syntax](https://www.w3.org/TR/sparql11-query/) by *implementing a single class!*
* Implements advanced *SPARQL query rewriting techniques* for transparently optimizing SPARQL query processing.
* Supports Basic [Federated SPARQL queries](https://www.w3.org/TR/2013/REC-sparql11-federated-query-20130321/) using **SERVICE clauses**.
* Customize every step of SPARQL query processing, thanks to a component-based architecture.

:warning: **In Development** :warning:
* Support for all SPARQL property Paths.
* Support for the [SPARQL UPDATE protocol](https://www.w3.org/TR/2013/REC-sparql11-update-20130321/)
* Support for SPARQL EXISTS filters.

# Installation

```bash
npm install --save sparql-engine
```

# Getting started

The `sparql-engine` framework allow you to build a custom SPARQL query engine on top of any data storage system.

In short, to support SPARQL queries on top of your data storage system, you need to:
* [Implements a subclass of `Graph`](#rdf-graphs), which provides access to the data storage system.
* Gather all your Graphs as a `Dataset` (using your own implementation of [the default one](#rdf-datasets)).
* [Instantiate a `PlanBuilder`](#running-a-sparql-query) and use it to execute SPARQL queries.

## Example

As an example, you can find an integration of [LevelGraph](https://github.com/levelgraph/levelgraph) with this framework [here](https://github.com/Callidon/sparql-engine/tree/master/examples/levelgraph.js).

## RDF Graphs

The first thing to do is to implement a subclass of the `Graph` abstract class. A `Graph` represents an [RDF Graph](https://www.w3.org/TR/rdf11-concepts/#section-rdf-graph) and is responsible for inserting, deleting and searching RDF triples in the database.

The main method to implement is `Graph.evalBGP(bgp, options)`, which is used by the framework to evaluates [Basic graph patterns](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#BasicGraphPatterns) against the RDF Graph.
This method is expected to return an [AsyncIterator](https://www.npmjs.com/package/asynciterator), which will be consumed to evaluate the BGP.
To support SELECT, CONSTRUCT, ASK and DESCRIBE queries, you only have to provides a graph that implements `evalBGP`.

Similarly, to support the [SPARQL UPDATE protocol](https://www.w3.org/TR/2013/REC-sparql11-update-20130321/), you have to provides a graph that implements the `insert(triples)` and `delete(triples)` methods, which insert and delete RDF triples from the graph, respectively.

```javascript
  const { Graph } = require('sparql-engine')

  class CustomGraph extends Graph {
    constructor () {
      super()
      this._db = // get a database instance
    }

    /*
      Implements this method to support
      the insertion of RDF triples in the database
    */
    insert (triples) {
      this._db.insertTriples(triples)
    }

    /*
      Implements this method to support
      the deletion of RDF triples from the database
    */
    delete (triples) {
      this._db.deleteTriples(triples)
    }

    /*
      Implements this method to support the evaluation
      of Basic Graph patterns, i.e., set of triples patterns.
    */
    evalBGP (bgp, options) {
      // This method must return an AsyncIterator
      return this._db.searchBasicGraphPattern(bgp)
    }
  }
```

## RDF Datasets

Once you have your subclass of `Graph` ready, you need to build a collection of RDF Graphs, called a [RDF Dataset](https://www.w3.org/TR/rdf11-concepts/#section-dataset). You can build your own implementation of a Dataset by subclassing [`Dataset`](), but a default implementation based on a HashMap is already available.

```javascript
 const { HashMapDataset } = require('sparql-engine')
 const CustomGraph = // import your Graph subclass

 const graph_a = new CustomGraph(/* ... */)
 const graph_b = new CustomGraph(/* ... */)

 // we set graph_a as the Default RDF dataset
 const dataset = new HashMapDataset(graph_a)

 // insert graph_b as a Named Graph
 dataset.addNamedGraph('http://example.org#graph_b', graph_b)
```

## Running a SPARQL query

Finally, to run a SPARQL query on your RDF dataset, you simply need to use the `PlanBuilder` class. It is responsible for parsing SPARQL queries and building a pipeline of iterators to evaluate them.

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
  iterator.on('data', b => console.log(b))
  iterator.on('error', err => console.error(err))
  iterator.on('end', () => {
    console.log('Query evaluation complete!');
  })
```

# Documentation

To generate the documentation:
```bash
git clone https://github.com/Callidon/sparql-engine.git
cd sparql-engine
npm install
npm run doc
```

# References

* [Official W3C RDF specification](https://www.w3.org/TR/rdf11-concepts)
* [Official W3C SPARQL specification](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/)
