/* file : custom-aggregations.ts
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

import { intersectionWith, isUndefined, sum, zip } from 'lodash'
import { BindingGroup } from '../../rdf/bindings.js'
import { rdf } from '../../utils/index.js'

function precision(expected: rdf.Term[], predicted: rdf.Term[]): number {
  const intersection = intersectionWith(expected, predicted, (x, y) =>
    rdf.termEquals(x, y),
  )
  return intersection.length / predicted.length
}

function recall(expected: rdf.Term[], predicted: rdf.Term[]): number {
  const intersection = intersectionWith(expected, predicted, (x, y) =>
    rdf.termEquals(x, y),
  )
  return intersection.length / expected.length
}

/**
 * Implementation of Non standard SPARQL aggregations offered by the framework
 * All arguments are pre-compiled from string to rdf.js terms
 * @author Thomas Minier
 */
export default {
  /*
    Accuracy metrics, often used in machine learning
  */

  // Accuracy: computes percentage of times two variables have different values
  // In regular SPARQL, equivalent to sum(if(?a = ?b, 1, 0)) / count(*)
  'https://callidon.github.io/sparql-engine/aggregates#accuracy': function (
    a: rdf.Variable,
    b: rdf.Variable,
    rows: BindingGroup,
  ): rdf.Term {
    const tests = zip(rows.get(a.value), rows.get(b.value)).map((v) => {
      if (isUndefined(v[0]) || isUndefined(v[1])) {
        return 0
      }
      return rdf.termEquals(v[0], v[1]) ? 1 : 0
    })
    return rdf.createFloat(sum(tests) / tests.length)
  },

  // Geometric mean (https://en.wikipedia.org/wiki/Geometric_mean)
  // "The geometric mean is a mean or average, which indicates the central tendency or typical value of a set of
  // numbers by using the product of their values (as opposed to the arithmetic mean which uses their sum)."
  'https://callidon.github.io/sparql-engine/aggregates#gmean': function (
    variable: rdf.Variable,
    rows: BindingGroup,
  ): rdf.Term {
    if (rows.has(variable.value)) {
      const count = rows.get(variable.value)!.length
      const product = rows
        .get(variable.value)!
        .map((term) => {
          if (rdf.isLiteral(term) && rdf.literalIsNumeric(term)) {
            return rdf.asJS<number>(term.value, term.datatype.value)
          }
          return 1
        })
        .reduce((acc, value) => acc * value, 1)
      return rdf.createFloat(Math.pow(product, 1 / count))
    }
    throw new SyntaxError(
      `SPARQL aggregation error: the variable ${variable} cannot be found in the groups ${rows}`,
    )
  },

  // Mean Square error: computes the average of the squares of the errors, that is
  // the average squared difference between the estimated values and the actual value.
  // In regular SPARQL, equivalent to sum(?a - ?b) * (?a - ?b / count(*))
  'https://callidon.github.io/sparql-engine/aggregates#mse': function (
    a: rdf.Variable,
    b: rdf.Variable,
    rows: BindingGroup,
  ): rdf.Term {
    const values = zip(rows.get(a.value), rows.get(b.value)).map((v) => {
      const expected = v[0]
      const predicted = v[1]
      if (isUndefined(predicted) || isUndefined(expected)) {
        return 0
      } else if (
        rdf.isLiteral(predicted) &&
        rdf.isLiteral(expected) &&
        rdf.literalIsNumeric(predicted) &&
        rdf.literalIsNumeric(expected)
      ) {
        return Math.pow(
          rdf.asJS<number>(expected.value, expected.datatype.value) -
            rdf.asJS<number>(predicted.value, predicted.datatype.value),
          2,
        )
      }
      throw new SyntaxError(
        `SPARQL aggregation error: cannot compute mean square error between RDF Terms ${expected} and ${predicted}, as they are not numbers`,
      )
    })
    return rdf.createFloat((1 / values.length) * sum(values))
  },

  // Root mean Square error: computes the root of the average of the squares of the errors
  // In regular SPARQL, equivalent to sqrt(sum(?a - ?b) * (?a - ?b / count(*)))
  'https://callidon.github.io/sparql-engine/aggregates#rmse': function (
    a: rdf.Variable,
    b: rdf.Variable,
    rows: BindingGroup,
  ): rdf.Term {
    const values = zip(rows.get(a.value), rows.get(b.value)).map((v) => {
      const expected = v[0]
      const predicted = v[1]
      if (isUndefined(predicted) || isUndefined(expected)) {
        return 0
      } else if (
        rdf.isLiteral(predicted) &&
        rdf.isLiteral(expected) &&
        rdf.literalIsNumeric(predicted) &&
        rdf.literalIsNumeric(expected)
      ) {
        return Math.pow(
          rdf.asJS<number>(expected.value, expected.datatype.value) -
            rdf.asJS<number>(predicted.value, predicted.datatype.value),
          2,
        )
      }
      throw new SyntaxError(
        `SPARQL aggregation error: cannot compute mean square error between RDF Terms ${expected} and ${predicted}, as they are not numbers`,
      )
    })
    return rdf.createFloat(Math.sqrt((1 / values.length) * sum(values)))
  },

  // Precision: the fraction of retrieved values that are relevant to the query
  'https://callidon.github.io/sparql-engine/aggregates#precision': function (
    a: rdf.Variable,
    b: rdf.Variable,
    rows: BindingGroup,
  ): rdf.Term {
    if (!rows.has(a.value) || !rows.has(b.value)) {
      return rdf.createFloat(0)
    }
    return rdf.createFloat(precision(rows.get(a.value)!, rows.get(b.value)!))
  },

  // Recall: the fraction of retrieved values that are successfully retrived
  'https://callidon.github.io/sparql-engine/aggregates#recall': function (
    a: rdf.Variable,
    b: rdf.Variable,
    rows: BindingGroup,
  ): rdf.Term {
    if (!rows.has(a.value) || !rows.has(b.value)) {
      return rdf.createFloat(0)
    }
    return rdf.createFloat(recall(rows.get(a.value)!, rows.get(b.value)!))
  },

  // F1 score: The F1 score can be interpreted as a weighted average of the precision and recall, where an F1 score reaches its best value at 1 and worst score at 0.
  'https://callidon.github.io/sparql-engine/aggregates#f1': function (
    a: rdf.Variable,
    b: rdf.Variable,
    rows: BindingGroup,
  ): rdf.Term {
    if (!rows.has(a.value) || !rows.has(b.value)) {
      return rdf.createFloat(0)
    }
    const prec = precision(rows.get(a.value)!, rows.get(b.value)!)
    const rec = recall(rows.get(a.value)!, rows.get(b.value)!)
    return rdf.createFloat((2 * (prec * rec)) / (prec + rec))
  },
}
