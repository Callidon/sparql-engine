/* file : fixtures.js
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

'use strict'

const expect = require('chai').expect

/**
 * Test an implementation of PipelineEngine
 * @param  {PipelineEngine} pipeline - Pipeline engine to test
 */
function testPipelineEngine (pipeline) {
  // empty method
  describe('#empty', () => {
    it('should create a PipelineStage which emits no items', done => {
      const out = pipeline.empty()
      let cpt = 0
      out.subscribe(() => cpt++, done, () => {
        expect(cpt).to.equal(0)
        done()
      })
    })
  })

  // of method
  describe('#of', () => {
    it('should create a PipelineStage from a single element', done => {
      const out = pipeline.of(1)
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.equal(1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })

    it('should create a PipelineStage from several elements', done => {
      const out = pipeline.of(1, 2, 3)
      const expected = [1, 2, 3]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // from method
  describe('#from', () => {
    it('should create a PipelineStage from an array', done => {
      const out = pipeline.from([1, 2, 3])
      const expected = [1, 2, 3]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })

    it('should create a PipelineStage from a Promise', done => {
      const out = pipeline.from(Promise.resolve(1))
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.equal(1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })

    it('should create a PipelineStage from another PipelineStage', done => {
      const out = pipeline.from(pipeline.of(1))
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.equal(1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })
  })

  describe('#fromAsync', () => {
    it('should create a PipelineStage from an async source of values', done => {
      const expected = [1, 2, 3]
      const out = pipeline.fromAsync(input => {
        setTimeout(() => {
          input.next(1)
          input.next(2)
          setTimeout(() => {
            input.next(3)
            input.complete()
          }, 5)
        }, 5)
      })
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })

    it('should catch errors when generating values asynchronously', done => {
      const out = pipeline.fromAsync(input => {
        setTimeout(() => {
          input.error()
        }, 5)
      })
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, () => {
        expect(cpt).to.equal(0)
        done()
      }, () => {
        expect().fail('The pipeline should not complete when an error is thrown')
        done()
      })
    })
  })

  // clone method
  describe('#clone', () => {
    it('should clone an existing PipelineStage', done => {
      const source = pipeline.of(1, 2, 3)
      const out = pipeline.clone(source)
      const expected = [1, 2, 3]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  describe('#catch', () => {
    it('should catch errors raised inside the pipeline', done => {
      const source = pipeline.map(pipeline.of(1, 2, 3), () => {
        throw new Error()
      })
      const out = pipeline.catch(source, err => {
        return pipeline.of(5)
      })
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.equal(5)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })
  })

  // merge method
  describe('#merge', () => {
    it('should merge two PipelineStage into a single one', done => {
      const out = pipeline.merge(pipeline.of(1, 2), pipeline.of(3))
      const expected = [1, 2, 3]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })

    it('should merge three PipelineStage into a single one', done => {
      const out = pipeline.merge(pipeline.of(1, 2), pipeline.of(3), pipeline.of(4, 5))
      const expected = [1, 2, 3, 4, 5]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(5)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // map method
  describe('#map', () => {
    it('should transform items of a PipelineStage', done => {
      const out = pipeline.map(pipeline.of(1, 2, 3), x => x * 2)
      const expected = [2, 4, 6]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // mergeMap method
  describe('#mergeMap', () => {
    it('should transform items of a PipelineStage using PipelineStage that emits one item', done => {
      const out = pipeline.mergeMap(pipeline.of(1, 2, 3), x => pipeline.of(x * 2))
      const expected = [2, 4, 6]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })

    it('should transform items of a PipelineStage using PipelineStage that emits several items', done => {
      const out = pipeline.mergeMap(pipeline.of(1, 2, 3), x => pipeline.of(x * 2, x * 3))
      const expected = [2, 4, 6, 3, 6, 9]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(6)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // flatMap method
  describe('#flatMap', () => {
    it('shoudl transform items of a PipelineStage into flattened array of items', done => {
      const out = pipeline.flatMap(pipeline.of(1, 2, 3), x => [x * 2, x * 3])
      const expected = [2, 4, 6, 3, 6, 9]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(6)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // reduce method
  describe('#reduce', () => {
    it('should reduce elements emitted by a PipelineStage', done => {
      const out = pipeline.reduce(pipeline.of(1, 2, 3), (acc, x) => acc + x, 0)
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.equal(6)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })

    it('should reduce elements emitted by an empty PipelineStage into the initial value', done => {
      const out = pipeline.reduce(pipeline.empty(), (acc, x) => acc + x, 0)
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.equal(0)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })
  })

  // limit method
  describe('#limit', () => {
    it('should limit the output of a PipelineStage', done => {
      const out = pipeline.limit(pipeline.of(1, 2, 3, 4, 5), 2)
      const expected = [1, 2, 3, 4, 5]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(2)
        expect(expected.length).to.equal(3)
        done()
      })
    })

    it('should limit the output of an empty PipelineStage', done => {
      const out = pipeline.limit(pipeline.empty(), 2)
      let cpt = 0
      out.subscribe(() => {
        cpt++
      }, done, () => {
        expect(cpt).to.equal(0)
        done()
      })
    })

    it('should work if the limit is higher that the number of items emitted by a PipelineStage', done => {
      const out = pipeline.limit(pipeline.of(1, 2, 3, 4, 5), 12)
      const expected = [1, 2, 3, 4, 5]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(5)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // skip method
  describe('#skip', () => {
    it('should skip the output of a PipelineStage', done => {
      const out = pipeline.skip(pipeline.of(1, 2, 3, 4, 5), 2)
      const expected = [1, 2, 3, 4, 5]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(2)
        done()
      })
    })

    it('should skip the output of an empty PipelineStage', done => {
      const out = pipeline.skip(pipeline.empty(), 2)
      let cpt = 0
      out.subscribe(() => {
        cpt++
      }, done, () => {
        expect(cpt).to.equal(0)
        done()
      })
    })

    it('should work if the skip is higher that the number of items emitted by a PipelineStage', done => {
      const out = pipeline.skip(pipeline.of(1, 2, 3, 4, 5), 12)
      let cpt = 0
      out.subscribe(() => {
        cpt++
      }, done, () => {
        expect(cpt).to.equal(0)
        done()
      })
    })
  })

  // distinct method
  describe('#distinct', () => {
    it('should remove duplicated elements emitted by a PipelineStage', done => {
      const out = pipeline.distinct(pipeline.of(1, 1, 2, 2, 3, 3))
      const expected = [1, 2, 3]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })

    it('should remove duplicated elements using a selector function', done => {
      const out = pipeline.distinct(pipeline.of(1, 2, 3), x => (x === 2) ? 1 : x)
      const expected = [1, 3]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(2)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // forEach method
  describe('#forEach', () => {
    it('should invoke a callback on each item emitted by a PipelineStage', done => {
      let cpt = 0
      const expected = [1, 2, 3]
      pipeline.forEach(pipeline.of(1, 2, 3), x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
        if (cpt === 3) {
          expect(expected.length).to.equal(0)
          done()
        }
      })
    })
  })

  // defaultValues method
  describe('#defaultValues', () => {
    it('should set a (single) default for an empty PipelineStage', done => {
      const out = pipeline.defaultValues(pipeline.empty(), 1)
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.equal(1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })

    it('should set several default values for an empty PipelineStage', done => {
      const out = pipeline.defaultValues(pipeline.empty(), 1, 2, 3)
      const expected = [1, 2, 3]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(3)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // bufferCount method
  describe('#bufferCount', () => {
    it('should buffer items emitted by a PipelineStage', done => {
      const out = pipeline.bufferCount(pipeline.of(1, 2, 3, 4), 2)
      const expected = [1, 2, 3, 4]
      let cpt = 0
      out.subscribe(chunk => {
        expect(chunk.length).to.equal(2)
        chunk.forEach(x => {
          expect(x).to.be.oneOf(expected)
          expected.splice(expected.indexOf(x), 1)
          cpt++
        })
      }, done, () => {
        expect(cpt).to.equal(4)
        expect(expected.length).to.equal(0)
        done()
      })
    })

    it('should buffer items even if the buffer size is higher that the total number of items produced', done => {
      const out = pipeline.bufferCount(pipeline.of(1, 2, 3, 4), 5)
      const expected = [1, 2, 3, 4]
      let cpt = 0
      out.subscribe(chunk => {
        expect(chunk.length).to.equal(4)
        chunk.forEach(x => {
          expect(x).to.be.oneOf(expected)
          expected.splice(expected.indexOf(x), 1)
          cpt++
        })
      }, done, () => {
        expect(cpt).to.equal(4)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // collect method
  describe('#collect', () => {
    it('should collect all values emitted by a PipelineStage as an array', done => {
      const out = pipeline.collect(pipeline.of(1, 2, 3, 4))
      const expected = [1, 2, 3, 4]
      let cpt = 0
      out.subscribe(chunk => {
        expect(chunk.length).to.equal(4)
        chunk.forEach(x => {
          expect(x).to.be.oneOf(expected)
          expected.splice(expected.indexOf(x), 1)
        })
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        expect(expected.length).to.equal(0)
        done()
      })
    })

    it('should produce an empty array when applied to an empty PipelineStage', done => {
      const out = pipeline.collect(pipeline.empty())
      let cpt = 0
      out.subscribe(chunk => {
        expect(chunk.length).to.equal(0)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })
  })

  // first method
  describe('#first', () => {
    it('should emit the first item of the PipelineStage', done => {
      const out = pipeline.first(pipeline.of(1, 2))
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf([1, 2])
        cpt++
      }, done, () => {
        expect(cpt).to.equal(1)
        done()
      })
    })
  })

  // endWith method
  describe('#endsWith', () => {
    it('should append items at the end of the PipelineStage', done => {
      const out = pipeline.endWith(pipeline.empty(), [1, 2, 3, 4])
      const expected = [1, 2, 3, 4]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(4)
        expect(expected.length).to.equal(0)
        done()
      })
    })
  })

  // tap method
  describe('#tap', () => {
    it('should invoke a function on each item in a PipelineStage, then forward the item', done => {
      let nbTaps = 0
      const out = pipeline.tap(pipeline.of(1, 2, 3, 4), () => nbTaps++)
      const expected = [1, 2, 3, 4]
      let cpt = 0
      out.subscribe(x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      }, done, () => {
        expect(cpt).to.equal(4)
        expect(nbTaps).to.equal(4)
        expect(expected.length).to.equal(0)
        done()
      })
    })

    it('should not invoke the function when applied to an empty PipelineStage', done => {
      let nbTaps = 0
      const out = pipeline.tap(pipeline.empty(), () => nbTaps++)
      let cpt = 0
      out.subscribe(() => {
        cpt++
      }, done, () => {
        expect(cpt).to.equal(0)
        expect(nbTaps).to.equal(0)
        done()
      })
    })
  })
}

module.exports = testPipelineEngine
