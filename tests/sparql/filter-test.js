/* file : filter-test.js
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

const expect = require('chai').expect
const { getGraph, TestEngine } = require('../utils.js')

describe('FILTER SPARQL queries', () => {
  let engine = null
  before(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  const data = [
    {
      name: '=',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(?name = "Thomas Minier"@en)
      }`,
      expectedNb: 1
    },
    {
      name: '!=',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(?name != "Thomas Minier")
      }`,
      expectedNb: 1
    },
    {
      name: '<',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(10 < 20)
      }`,
      expectedNb: 1
    },
    {
      name: '>',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(10 > 20)
      }`,
      expectedNb: 0
    },
    {
      name: '<=',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(10 <= 10)
      }`,
      expectedNb: 1
    },
    {
      name: '>=',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(20 >= 10)
      }`,
      expectedNb: 1
    },
    {
      name: '= (using xsd:DateTime)',
      query: `
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        <https://dblp.org/pers/m/Minier:Thomas.nt> <http://purl.org/dc/terms/modified> ?date .
        FILTER("2018-08-04T00:54:27+0200"^^xsd:dateTime = ?date)
      }`,
      expectedNb: 1
    },
    {
      name: '!= (using xsd:DateTime)',
      query: `
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        <https://dblp.org/pers/m/Minier:Thomas.nt> <http://purl.org/dc/terms/modified> ?date .
        FILTER("2018-08-10T01:54:27+0200"^^xsd:dateTime != ?date)
      }`,
      expectedNb: 1
    },
    {
      name: '< (using xsd:DateTime)',
      query: `
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        <https://dblp.org/pers/m/Minier:Thomas.nt> <http://purl.org/dc/terms/modified> ?date .
        FILTER("2017-08-04T00:54:27+0200"^^xsd:dateTime < ?date)
      }`,
      expectedNb: 1
    },
    {
      name: '> (using xsd:DateTime)',
      query: `
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        <https://dblp.org/pers/m/Minier:Thomas.nt> <http://purl.org/dc/terms/modified> ?date .
        FILTER("2018-10-04T00:54:27+0200"^^xsd:dateTime > ?date)
      }`,
      expectedNb: 1
    },
    {
      name: '<= (using xsd:DateTime)',
      query: `
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        <https://dblp.org/pers/m/Minier:Thomas.nt> <http://purl.org/dc/terms/modified> ?date .
        FILTER("2018-08-04T00:54:27+0200"^^xsd:dateTime <= ?date && "2017-08-04T00:54:27+0200"^^xsd:dateTime <= ?date)
      }`,
      expectedNb: 1
    },
    {
      name: '>= (using xsd:DateTime)',
      query: `
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        <https://dblp.org/pers/m/Minier:Thomas.nt> <http://purl.org/dc/terms/modified> ?date .
        FILTER("2018-08-04T00:54:27+0200"^^xsd:dateTime >= ?date && "2018-10-04T00:54:27+0200"^^xsd:dateTime >= ?date)
      }`,
      expectedNb: 1
    },
    {
      name: '+',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(10 + 10 = 20)
      }`,
      expectedNb: 1
    },
    {
      name: '-',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(10 - 10 = 20)
      }`,
      expectedNb: 0
    },
    {
      name: '*',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(10 * 10 > 20)
      }`,
      expectedNb: 1
    },
    {
      name: '/',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(10 / 2 = 5)
      }`,
      expectedNb: 1
    },
    {
      name: '&&',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(?name = "Thomas Minier"@en && 10 < 20)
      }`,
      expectedNb: 1
    },
    {
      name: '||',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(?name = "Thomas Minier"@en || 10 < 20)
      }`,
      expectedNb: 1
    },
    {
      name: '!',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(!(?name = "Thomas Minier"@en))
      }`,
      expectedNb: 0
    },
    {
      name: 'IN',
      query: `
      PREFIX esws: <https://dblp.org/rec/conf/esws/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:authorOf ?article .
        FILTER(?article IN (esws:MinierSMV18a, esws:MinierSMV18, esws:MinierMSM17))
      }`,
      expectedNb: 3
    },
    {
      name: 'NOT IN',
      query: `
      PREFIX esws: <https://dblp.org/rec/conf/esws/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:authorOf ?article .
        FILTER(?article NOT IN (esws:MinierSMV18a, esws:MinierSMV18, esws:MinierMSM17))
      }`,
      expectedNb: 2
    },
    {
      name: 'isIRI',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(isIRI(?s))
      }`,
      expectedNb: 1
    },
    {
      name: 'isBlank',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(isBlank(?name))
      }`,
      expectedNb: 0
    },
    {
      name: 'isLiteral',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(isLiteral(?name))
      }`,
      expectedNb: 1
    },
    {
      name: 'isNumeric',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(!isNumeric(?name) && isNumeric(10))
      }`,
      expectedNb: 1
    },
    {
      name: 'str',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(str(?s) = "https://dblp.org/pers/m/Minier:Thomas")
      }`,
      expectedNb: 1
    },
    {
      name: 'lang',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(lang(?name) = "en")
      }`,
      expectedNb: 1
    },
    {
      name: 'lang (no lang tag on literal)',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(lang(?s) = "")
      }`,
      expectedNb: 1
    },
    {
      name: 'datatype',
      query: `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdfs:label ?label
        FILTER(datatype(?label) = xsd:string)
      }`,
      expectedNb: 1
    },
    {
      name: 'datatype (no datatype)',
      query: `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdfs:label ?label
        FILTER(datatype(?s) = "")
      }`,
      expectedNb: 1
    },
    {
      name: 'datatype (with lang tag)',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(datatype(?name) = rdf:langString)
      }`,
      expectedNb: 1
    },
    {
      name: 'iri',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(iri("https://dblp.org/pers/m/Minier:Thomas") = ?s)
      }`,
      expectedNb: 1
    },
    {
      name: 'strdt',
      query: `
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        <https://dblp.org/pers/m/Minier:Thomas.nt> <http://purl.org/dc/terms/modified> ?date .
        FILTER(strdt("2018-08-04T00:54:27+0200", xsd:dateTime) = ?date)
      }`,
      expectedNb: 1
    },
    {
      name: 'strlang',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(strlang("Thomas Minier", "en") = ?name)
      }`,
      expectedNb: 1
    },
    {
      name: 'uuid',
      query: `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdfs:label ?label
        FILTER(isiri(uuid()) && uuid() != uuid())
      }`,
      expectedNb: 1
    },
    {
      name: 'struuid',
      query: `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdfs:label ?label
        FILTER(isliteral(struuid()) && struuid() != struuid())
      }`,
      expectedNb: 1
    },
    {
      name: 'strlen',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(strlen(?name) = 13)
      }`,
      expectedNb: 1
    },
    {
      name: 'substr',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(substr("foobar", 4) = "bar")
      }`,
      expectedNb: 1
    },
    {
      name: 'substr (with length)',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(substr("foobar", 4, 2) = "ba")
      }`,
      expectedNb: 1
    },
    {
      name: 'ucase',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(ucase(?name) = "THOMAS MINIER"@en)
      }`,
      expectedNb: 1
    },
    {
      name: 'lcase',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(lcase(?name) = "thomas minier"@en)
      }`,
      expectedNb: 1
    },
    {
      name: 'strstarts',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(strstarts(?name, "Thomas"))
      }`,
      expectedNb: 1
    },
    {
      name: 'strends',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(strends(?name, "Norris"))
      }`,
      expectedNb: 0
    },
    {
      name: 'contains',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(contains(?name, "Thomas"))
      }`,
      expectedNb: 1
    },
    {
      name: 'strbefore',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(strbefore(?name, "Minier") = "Thomas "@en)
      }`,
      expectedNb: 1
    },
    {
      name: 'strafter',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(strafter(?name, "Thomas") = " Minier"@en)
      }`,
      expectedNb: 1
    },
    {
      name: 'encode_for_uri',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(encode_for_uri(?name) = "Thomas%20Minier")
      }`,
      expectedNb: 1
    },
    {
      name: 'concat',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(concat("Thomas "@en, "Minier"@en) = ?name)
      }`,
      expectedNb: 1
    },
    {
      name: 'concat (not the same literal types)',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(concat("Thomas ", "Minier"@en) = "Thomas Minier")
      }`,
      expectedNb: 1
    },
    {
      name: 'langmatches',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(langmatches(lang(?name), "EN"))
      }`,
      expectedNb: 1
    },
    {
      name: 'regex',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(regex(?name, "^tho"))
      }`,
      expectedNb: 0
    },
    {
      name: 'regex (with flags)',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        FILTER(regex(?name, "^tho", "i"))
      }`,
      expectedNb: 1
    },
    {
      name: 'replace',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(replace("abcd", "b", "Z") = "aZcd")
      }`,
      expectedNb: 1
    },
    {
      name: 'replace (with flags)',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(replace("abab", "B", "Z", "i") = "aZab")
      }`,
      expectedNb: 1
    },
    {
      name: 'replace (with complex REGEX)',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(replace("abab", "B.", "Z","i") = "aZb")
      }`,
      expectedNb: 1
    },
    {
      name: 'abs',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(abs(-10) = 10)
      }`,
      expectedNb: 1
    },
    {
      name: 'round',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(round(10.01) = 10)
      }`,
      expectedNb: 1
    },
    {
      name: 'ceil',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(ceil(7.004) = 8)
      }`,
      expectedNb: 1
    },
    {
      name: 'floor',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(floor(7.004) = 7)
      }`,
      expectedNb: 1
    },
    {
      name: 'bound',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(bound(?s))
      }`,
      expectedNb: 1
    },
    {
      name: 'now',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(datatype(now()) = xsd:dateTime)
      }`,
      expectedNb: 1
    },
    {
      name: 'year',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(year("2011-01-10T14:45:13.815-05:00"^^xsd:dateTime) = 2011)
      }`,
      expectedNb: 1
    },
    {
      name: 'month',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(month("2011-01-10T14:45:13.815-05:00"^^xsd:dateTime) = 1)
      }`,
      expectedNb: 1
    },
    {
      name: 'day',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(day("2011-01-10T14:45:13.815-05:00"^^xsd:dateTime) = 10)
      }`,
      expectedNb: 1
    },
    {
      name: 'hours',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(hours("2011-01-10T14:45:13.815-05:00"^^xsd:dateTime) = 14)
      }`,
      expectedNb: 1
    },
    {
      name: 'minutes',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(minutes("2011-01-10T14:45:13.815-05:00"^^xsd:dateTime) = 45)
      }`,
      expectedNb: 1
    },
    {
      name: 'seconds',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(seconds("2011-01-10T14:45:13.815-05:00"^^xsd:dateTime) = 13)
      }`,
      expectedNb: 1
    },
    {
      name: 'tz',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(tz("2011-01-10T14:45:13.815-05:00"^^xsd:dateTime) = "-5")
      }`,
      expectedNb: 1
    },
    {
      name: 'md5',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(MD5("abc") = "900150983cd24fb0d6963f7d28e17f72")
      }`,
      expectedNb: 1
    },
    {
      name: 'sha1',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(SHA1("abc") = "a9993e364706816aba3e25717850c26c9cd0d89d")
      }`,
      expectedNb: 1
    },
    {
      name: 'sha256',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(SHA256("abc") = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
      }`,
      expectedNb: 1
    },
    {
      name: 'sha384',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(SHA384("abc") = "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7")
      }`,
      expectedNb: 1
    },
    {
      name: 'sha512',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER(SHA512("abc") = "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f")
      }`,
      expectedNb: 1
    },
    {
      name: 'EXISTS',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER EXISTS { ?s dblp-rdf:primaryFullPersonName ?name }
      }`,
      expectedNb: 1
    },
    {
      name: 'NOT EXISTS',
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        FILTER NOT EXISTS { ?s dblp-rdf:primaryFullPersonName "Chunck Norris" }
      }`,
      expectedNb: 1
    },
    {
      name: 'COALESCE (value is bound)',
      query: `
      SELECT * WHERE {
        BIND("Thomas" AS ?x)
        FILTER(COALESCE(?x, "Arnaud") = "Thomas")
      }`,
      expectedNb: 1
    },
    {
      name: 'COALESCE (value is not bound)',
      query: `
      SELECT * WHERE {
        BIND("Thomas" AS ?y)
        FILTER(COALESCE(?x, "Arnaud") = "Arnaud")
      }`,
      expectedNb: 1
    },
    {
      name: 'IF (expression is true)',
      query: `
      SELECT * WHERE {
        BIND("Thomas" AS ?x)
        FILTER(IF(?x = "Thomas", 0, 1) = 0)
      }`,
      expectedNb: 1
    },
    {
      name: 'IF (expression is false)',
      query: `
      SELECT * WHERE {
        BIND("Arnaud" AS ?x)
        FILTER(IF(?x = "Thomas", 0, 1) = 1)
      }`,
      expectedNb: 1
    }
  ]

  data.forEach(d => {
    it(`should evaluate the "${d.name}" FILTER`, done => {
      const results = []
      const iterator = engine.execute(d.query)
      iterator.subscribe(b => {
        results.push(b)
      }, done, () => {
        expect(results.length).to.equal(d.expectedNb)
        done()
      })
    })
  })
})
