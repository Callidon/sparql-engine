/* file : construct-test.js
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

import { expect } from 'chai'
import { beforeAll, describe, it } from 'vitest'
import { TestEngine, getGraph } from '../utils'

describe('CONSTRUCT SPARQL queries', () => {
  let engine = null
  beforeAll(() => {
    const g = getGraph('./tests/data/dblp.nt')
    engine = new TestEngine(g)
  })

  it('should evaluate simple CONSTRUCT queries', async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    CONSTRUCT {
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }
    WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`
    let expectedArticles = [
      'https://dblp.org/rec/conf/esws/MinierSMV18a',
      'https://dblp.org/rec/conf/esws/MinierSMV18',
      'https://dblp.org/rec/journals/corr/abs-1806-00227',
      'https://dblp.org/rec/conf/esws/MinierMSM17',
      'https://dblp.org/rec/conf/esws/MinierMSM17a',
    ]

    const results = await engine.execute(query).toArray()
    results.forEach((triple) => {
      expect(triple).to.have.all.keys('subject', 'predicate', 'object')
      expect(triple.subject.value).to.equal(
        'https://dblp.org/pers/m/Minier:Thomas',
      )
      expect(triple.predicate.value).to.be.oneOf([
        'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName',
        'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf',
      ])
      if (
        triple.predicate.value ===
        'https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName'
      ) {
        expect(triple.object.value).to.equal('Thomas Minier')
        expect(triple.object.id).to.equal('"Thomas Minier"@en')
      } else {
        expect(triple.object.value).to.be.oneOf(expectedArticles)
        expectedArticles = expectedArticles.filter(
          (a) => a !== triple.object.value,
        )
      }
    })
    expect(results.length).to.equal(10)
    expect(expectedArticles.length).to.equal(0)
  })
})
