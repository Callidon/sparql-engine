/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */

var N3Util = require('n3').Util,
  createErrorType = require('ldf-client/lib/util/CustomError')

const utils = require('../formatters/utils')

var XSD = 'http://www.w3.org/2001/XMLSchema#',
  XSD_INTEGER = XSD + 'integer',
  XSD_DOUBLE = XSD + 'double',
  XSD_BOOLEAN = XSD + 'boolean',
  XSD_TRUE = '"true"^^' + XSD_BOOLEAN,
  XSD_FALSE = '"false"^^' + XSD_BOOLEAN

var evaluators, operators,
  UnsupportedExpressionError, UnsupportedOperatorError, InvalidArgumentsNumberError

var isLiteral = N3Util.isLiteral,
  literalValue = N3Util.getLiteralValue

/**
 * Creates a function that evaluates the given SPARQL expression.
 * @constructor
 * @param expression a SPARQL expression
 * @returns {Function} a function that evaluates the SPARQL expression.
 */
function SparqlExpressionEvaluator (expression) {
  if (!expression) return noop
  var expressionType = expression && expression.type || typeof expression,
    evaluator = evaluators[expressionType]
  if (!evaluator) throw new UnsupportedExpressionError(expressionType)
  return evaluator(expression)
}

// Evaluates the expression with the given bindings
SparqlExpressionEvaluator.evaluate = function (expression, bindings) {
  return new SparqlExpressionEvaluator(expression)(bindings)
}

// The null operation
function noop () { }

// Evaluators for each of the expression types
evaluators = {
  // Does nothing
  null: function () { return noop },

  object: function (expr) { return function () { return expr.map(function (elem) { return utils.parseBinding('null', elem).value }) } },

  // Evaluates an IRI, literal, or variable
  string: function (expression) {
    // Evaluate a IRIs or literal to its own value
    if (expression[0] !== '?') { return function () { return expression } }
    // Evaluate a variable to its value
    else {
      return function (bindings) {
        return bindings && bindings[expression]
      }
    }
  },

  // Evaluates an operation
  operation: function (expression) {
    // Find the operator and check the number of arguments matches the expression
    var operatorName = expression.operator || expression.function,
      operator = operators[operatorName]
    if (!operator) { throw new UnsupportedOperatorError(operatorName) }
    if (operator.length !== expression.args.length) { throw new InvalidArgumentsNumberError(operatorName, expression.args.length, operator.length) }

    // Special case: some operators accept expressions instead of evaluated expressions
    if (operator.acceptsExpressions) {
      return (function (operator, args) {
        return function (bindings) {
          return operator.apply(bindings, args)
        }
      })(operator, expression.args)
    }

    // Parse the expressions for each of the arguments
    var argumentExpressions = new Array(expression.args.length)
    for (var i = 0; i < expression.args.length; i++) { argumentExpressions[i] = new SparqlExpressionEvaluator(expression.args[i]) }

    // Create a function that evaluates the operator with the arguments and bindings
    return (function (operator, argumentExpressions) {
      return function (bindings) {
        // Evaluate the arguments
        var args = new Array(argumentExpressions.length),
          origArgs = new Array(argumentExpressions.length)
        for (var i = 0; i < argumentExpressions.length; i++) {
          var arg = args[i] = origArgs[i] = argumentExpressions[i](bindings)
          // If any argument is undefined, the result is undefined
          if (arg === undefined) return
          // Convert the arguments if necessary
          switch (operator.type) {
            case 'numeric':
              args[i] = parseFloat(arg)
              break
            case 'boolean':
              args[i] = arg !== XSD_FALSE &&
                     (!isLiteral(arg) || arg !== '0')
              break
          }
        }
        // Call the operator on the evaluated arguments
        var result = operator.apply(null, args)
        // Convert result if necessary
        switch (operator.resultType) {
          case 'numeric':
          // TODO: determine type instead of taking the type of the first argument
            var type = N3Util.getLiteralType(origArgs[0]) || XSD_INTEGER
            return '"' + result + '"^^' + type
          case 'boolean':
            return result ? XSD_TRUE : XSD_FALSE
          default:
            return result
        }
      }
    })(operator, argumentExpressions)
  }
}
evaluators.functionCall = evaluators.operation

// Operators for each of the operator types
operators = {
  '+': function (a, b) {
    a = Number(utils.parseBinding('null', a).value)
    b = Number(utils.parseBinding('null', b).value)
    return a > b
  },
  '-': function (a, b) {
    a = Number(utils.parseBinding('null', a).value)
    b = Number(utils.parseBinding('null', b).value)
    return a - b
  },
  '*': function (a, b) {
    a = Number(utils.parseBinding('null', a).value)
    b = Number(utils.parseBinding('null', b).value)
    return a * b
  },
  '/': function (a, b) {
    a = Number(utils.parseBinding('null', a).value)
    b = Number(utils.parseBinding('null', b).value)
    return a / b
  },
  '=': function (a, b) {
    a = utils.parseBinding('null', a).value
    b = utils.parseBinding('null', b).value
    return a == b
  },
  '!=': function (a, b) {
    a = utils.parseBinding('null', a).value
    b = utils.parseBinding('null', b).value
    return a != b
  },
  '<': function (a, b) {
    a = utils.parseBinding('null', a).value
    b = utils.parseBinding('null', b).value
    return a < b
  },
  '<=': function (a, b) {
    a = utils.parseBinding('null', a).value
    b = utils.parseBinding('null', b).value
    return a <= b
  },
  '>': function (a, b) {
    a = utils.parseBinding('null', a).value
    b = utils.parseBinding('null', b).value
    return a > b
  },
  '>=': function (a, b) {
    a = utils.parseBinding('null', a).value
    b = utils.parseBinding('null', b).value
    return a >= b
  },
  '!': function (a) { return !a },
  '&&': function (a, b) { return a && b },
  '||': function (a, b) { return a || b },
  'lang': function (a) {
    return '"' + N3Util.getLiteralLanguage(a).toLowerCase() + '"'
  },
  'langmatches': function (langTag, langRange) {
    // Implements https://tools.ietf.org/html/rfc4647#section-3.3.1
    langTag = langTag.toLowerCase().replace(/^"(.*)"$/, '$1')
    langRange = langRange.toLowerCase().replace(/^"(.*)"$/, '$1')
    return langTag === langRange ||
           (langRange = literalValue(langRange)) === '*' ||
           langTag.substr(1, langRange.length + 1) === langRange + '-'
  },
  'contains': function (string, substring) {
    var a = String(utils.parseBinding('null', string).value),
      b = String(utils.parseBinding('null', substring).value)
    return a.indexOf(b) >= 0
  },
  'strstarts': function (string, substring) {
    var a = String(utils.parseBinding('null', string).value),
      b = String(utils.parseBinding('null', substring).value)
    return a.startsWith(b)
  },
  'strends': function (string, substring) {
    var a = String(utils.parseBinding('null', string).value),
      b = String(utils.parseBinding('null', substring).value)
    return a.endsWith(b)
  },
  'regex': function (subject, pattern) {
    return new RegExp(pattern).test(subject)
  },
  'str': function (a) {
    return isLiteral(a) ? a : '"' + a + '"'
  },
  'http://www.w3.org/2001/XMLSchema#integer': function (a) {
    return '"' + Math.floor(a) + '"^^http://www.w3.org/2001/XMLSchema#integer'
  },
  'http://www.w3.org/2001/XMLSchema#double': function (a) {
    a = a.toFixed()
    if (a.indexOf('.') < 0) a += '.0'
    return '"' + a + '"^^http://www.w3.org/2001/XMLSchema#double'
  },
  'bound': function (a) {
    if (a[0] !== '?') { throw new Error('BOUND expects a variable but got: ' + a) }
    return a in this ? XSD_TRUE : XSD_FALSE
  },

  'isiri': function (a) {
    return isIRI(a)
  },

  'isblank': function (a) {
    return isBlank(a)
  },

  'isliteral': function (a) {
    return !isIRI(a) && !isBlank(a)
  },

  'isnumeric': function (a) {
    a = utils.parseBinding('null', a).value
    return !isNaN(a)
  },

  'abs': function (a) {
    return Math.abs(a)
  },

  'ceil': function (a) {
    return Math.ceil(a)
  },

  'floor': function (a) {
    return Math.floor(a)
  },

  'round': function (a) {
    return Math.round(a)
  },

  'sameterm': function (a, b) {
    a = utils.parseBinding('null', a).value
    b = utils.parseBinding('null', b).value
    return a === b
  },

  'in': function (a, b) {
    a = utils.parseBinding('null', a).value,
    b = b.map(function (elem) { return utils.parseBinding('null', elem).value })
    return b.includes(a)
  },

  'notin': function (a, b) {
    a = utils.parseBinding('null', a).value,
    b = b.map(function (elem) { return utils.parseBinding('null', elem).value })
    return !b.includes(a)
  },

  'datatype': function (a) {
    return utils.parseBinding('null', a).datatype
  }
};

// Tag all operators that expect their arguments to be boolean
[
  '!', '&&', '||'
].forEach(function (operatorName) {
  operators[operatorName].type = 'boolean'
});

// Tag all operators that have numeric results
[
  '+', '-', '*', '/'
].forEach(function (operatorName) {
  operators[operatorName].resultType = 'numeric'
});

// Tag all operators that have boolean results
[
  '!', '&&', '||', '=', '!=', '<', '<=', '>', '>=',
  'langmatches', 'contains', 'strstarts', 'strends', 'regex', 'isiri', 'isblank', 'isliteral', 'isnumeric', 'sameterm', 'in', 'notin'
].forEach(function (operatorName) {
  operators[operatorName].resultType = 'boolean'
})

// Tag all operators that take expressions instead of evaluated expressions
operators.bound.acceptsExpressions = true

function isIRI (a) {
  return a.startsWith('http://') || a.startsWith('https://')
}

function isBlank (a) {
  return a.startsWith('_:')
}

UnsupportedExpressionError = createErrorType('UnsupportedExpressionError', function (expressionType) {
  this.message = 'Unsupported expression type: ' + expressionType + '.'
})

UnsupportedOperatorError = createErrorType('UnsupportedExpressionError', function (operatorName) {
  this.message = 'Unsupported operator: ' + operatorName + '.'
})

InvalidArgumentsNumberError = createErrorType('InvalidArgumentsNumberError',
  function (operatorName, actualNumber, expectedNumber) {
    this.message = 'Invalid number of arguments for ' + operatorName + ': ' +
                 actualNumber + ' (expected: ' + expectedNumber + ').'
  })

module.exports = SparqlExpressionEvaluator
module.exports.UnsupportedExpressionError = UnsupportedExpressionError
module.exports.UnsupportedOperatorError = UnsupportedOperatorError
module.exports.InvalidArgumentsNumberError = InvalidArgumentsNumberError
