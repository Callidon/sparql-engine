/* file : delete-test.js
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
import { beforeEach, describe, it } from 'vitest'
import { rdf } from '../../src/utils'
import { TestEngine, getGraph } from '../utils.js'

const GRAPH_IRI = rdf.createIRI('htpp://example.org#some-graph')

describe('SPARQL UPDATE: DELETE DATA queries', () => {
  let engine = null
  beforeEach(() => {
    const gA = getGraph(null)
    const gB = getGraph(null)
    engine = new TestEngine(gA)
    engine.addNamedGraph(GRAPH_IRI, gB)
  })

  it('should evaluate DELETE DATA queries without a named Graph', async () => {
    const query = `
    DELETE DATA {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf> <https://dblp.org/rec/conf/esws/MinierSMV18a>
    }`

    engine._graph._store.addQuad(
      'https://dblp.org/pers/m/Minier:Thomas',
      'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf',
      'https://dblp.org/rec/conf/esws/MinierSMV18a',
    )

    await engine
      .execute(query)
      .execute()
      .then(() => {
        const triples = engine._graph._store.getQuads(
          'https://dblp.org/pers/m/Minier:Thomas',
          'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf',
          'https://dblp.org/rec/conf/esws/MinierSMV18a',
        )
        expect(triples.length).to.equal(0)
      })
  })

  it('should evaluate DELETE DATA queries using a named Graph', async () => {
    const query = `
    DELETE DATA {
      GRAPH <${GRAPH_IRI.value}> {
        <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf> <https://dblp.org/rec/conf/esws/MinierSMV18a>
      }
    }`
    engine
      .getNamedGraph(GRAPH_IRI)
      ._store.addQuad(
        'https://dblp.org/pers/m/Minier:Thomas',
        'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf',
        'https://dblp.org/rec/conf/esws/MinierSMV18a',
      )

    await engine
      .execute(query)
      .execute()
      .then(() => {
        const triples = engine
          .getNamedGraph(GRAPH_IRI)
          ._store.getQuads(
            'https://dblp.org/pers/m/Minier:Thomas',
            'https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf',
            'https://dblp.org/rec/conf/esws/MinierSMV18a',
          )
        expect(triples.length).to.equal(0)
      })
  })
})
