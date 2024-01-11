/* file : fixtures.js
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

import { describe, expect, it } from 'vitest'


/**
 * Test an implementation of PipelineEngine
 * @param  {PipelineEngine} pipeline - Pipeline engine to test
 */
function testPipelineEngine(pipeline) {
  // empty method
  describe('#empty', async () => {
    it('should create a PipelineStage which emits no items', async () => {
      const out = pipeline.empty()
      let cpt = 0
      out.subscribe(() => cpt++, () => {
        throw new Error('should not have items')
      }, () => {
        expect(cpt).to.equal(0)
      })
    })
  })

  // of method
  describe('#of', async () => {
    it('should create a PipelineStage from a single element', async () => {
      const out = pipeline.of(1)
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.equal(1)
        cpt++
      })
      expect(cpt).to.equal(1)

    })

    it('should create a PipelineStage from several elements', async () => {
      const out = pipeline.of(1, 2, 3)
      const expected = [1, 2, 3]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(0)

    })
  })

  // from method
  describe('#from', () => {
    it('should create a PipelineStage from an array', async () => {
      const out = pipeline.from([1, 2, 3])
      const expected = [1, 2, 3]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(0)

    })

    it('should create a PipelineStage from a Promise', async () => {
      const out = pipeline.from(Promise.resolve(1))
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.equal(1)
        cpt++
      })
      expect(cpt).to.equal(1)
    })


    it('should create a PipelineStage from another PipelineStage', async () => {
      const out = pipeline.from(pipeline.of(1))
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.equal(1)
        cpt++
      })
      expect(cpt).to.equal(1)
    })
  })

  describe('#fromAsync', () => {
    it('should create a PipelineStage from an async source of values', async () => {
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
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })

      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(0)

    })

    it('should catch errors when generating values asynchronously', async () => {
      const out = pipeline.fromAsync(input => {
        setTimeout(() => {
          input.error()
        }, 5)
      })
      let rejected = false
      try {
        await asyncSubscribe(out, x => {
        }, () => { rejected = true })
      } catch (e) {
        expect(rejected).to.equal(true)
      }
    })
  })

  // clone method
  describe('#clone', () => {
    it('should clone an existing PipelineStage', async () => {
      const source = pipeline.of(1, 2, 3)
      const out = pipeline.clone(source)
      const expected = [1, 2, 3]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(0)

    })
  })

  describe('#catch', () => {
    it('should catch errors raised inside the pipeline', async () => {
      const source = pipeline.map(pipeline.of(1, 2, 3), () => {
        throw new Error()
      })
      const out = pipeline.catch(source, err => {
        return pipeline.of(5)
      })
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.equal(5)
        cpt++
      })
      expect(cpt).to.equal(1)

    })
  })

  // merge method
  describe('#merge', () => {
    it('should merge two PipelineStage into a single one', async () => {
      const out = pipeline.merge(pipeline.of(1, 2), pipeline.of(3))
      const expected = [1, 2, 3]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(0)

    })
  })

  it('should merge three PipelineStage into a single one', async () => {
    const out = pipeline.merge(pipeline.of(1, 2), pipeline.of(3), pipeline.of(4, 5))
    const expected = [1, 2, 3, 4, 5]
    let cpt = 0
    await asyncSubscribe(out, x => {
      expect(x).to.be.oneOf(expected)
      // pull out element
      expected.splice(expected.indexOf(x), 1)
      cpt++
    })
    expect(cpt).to.equal(5)
    expect(expected.length).to.equal(0)

  })

  // map method
  describe('#map', () => {
    it('should transform items of a PipelineStage', async () => {
      const out = pipeline.map(pipeline.of(1, 2, 3), x => x * 2)
      const expected = [2, 4, 6]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(0)

    })
  })

  // mergeMap method
  describe('#mergeMap', () => {
    it('should transform items of a PipelineStage using PipelineStage that emits one item', async () => {
      const out = pipeline.mergeMap(pipeline.of(1, 2, 3), x => pipeline.of(x * 2))
      const expected = [2, 4, 6]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(0)

    })
  })

  it('should transform items of a PipelineStage using PipelineStage that emits several items', async () => {
    const out = pipeline.mergeMap(pipeline.of(1, 2, 3), x => pipeline.of(x * 2, x * 3))
    const expected = [2, 4, 6, 3, 6, 9]
    let cpt = 0
    await asyncSubscribe(out, x => {
      expect(x).to.be.oneOf(expected)
      // pull out element
      expected.splice(expected.indexOf(x), 1)
      cpt++
    })
    expect(cpt).to.equal(6)
    expect(expected.length).to.equal(0)

  })

  // flatMap method
  describe('#flatMap', () => {
    it('shoudl transform items of a PipelineStage into flattened array of items', async () => {
      const out = pipeline.flatMap(pipeline.of(1, 2, 3), x => [x * 2, x * 3])
      const expected = [2, 4, 6, 3, 6, 9]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(6)
      expect(expected.length).to.equal(0)

    })
  })

  // flatten method
  describe('#flattend', () => {
    it('shoudl flatten the output of a PipelineStage that emits array of values', async () => {
      const out = pipeline.flatten(pipeline.of([1, 2], [3, 4], [5, 6]))
      const expected = [1, 2, 3, 4, 5, 6]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(6)
      expect(expected.length).to.equal(0)

    })
  })

  // reduce method
  describe('#reduce', () => {
    it('should reduce elements emitted by a PipelineStage', async () => {
      const out = pipeline.reduce(pipeline.of(1, 2, 3), (acc, x) => acc + x, 0)
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.equal(6)
        cpt++
      })
      expect(cpt).to.equal(1)

    })
  })

  it('should reduce elements emitted by an empty PipelineStage into the initial value', async () => {
    const out = pipeline.reduce(pipeline.empty(), (acc, x) => acc + x, 0)
    let cpt = 0
    await asyncSubscribe(out, x => {
      expect(x).to.equal(0)
      cpt++
    })
    expect(cpt).to.equal(1)

  })


  // limit method
  describe('#limit', () => {
    it('should limit the output of a PipelineStage', async () => {
      const out = pipeline.limit(pipeline.of(1, 2, 3, 4, 5), 2)
      const expected = [1, 2, 3, 4, 5]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(2)
      expect(expected.length).to.equal(3)

    })
  })

  it('should limit the output of an empty PipelineStage', async () => {
    const out = pipeline.limit(pipeline.empty(), 2)
    let cpt = 0
    out.subscribe(() => {
      cpt++
    })
    expect(cpt).to.equal(0)

  })

  it('should work if the limit is higher that the number of items emitted by a PipelineStage', async () => {
    const out = pipeline.limit(pipeline.of(1, 2, 3, 4, 5), 12)
    const expected = [1, 2, 3, 4, 5]
    let cpt = 0
    await asyncSubscribe(out, x => {
      expect(x).to.be.oneOf(expected)
      // pull out element
      expected.splice(expected.indexOf(x), 1)
      cpt++
    })
    expect(cpt).to.equal(5)
    expect(expected.length).to.equal(0)

  })

  // skip method
  describe('#skip', () => {
    it('should skip the output of a PipelineStage', async () => {
      const out = pipeline.skip(pipeline.of(1, 2, 3, 4, 5), 2)
      const expected = [1, 2, 3, 4, 5]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        // pull out element
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(2)

    })
  })

  it('should skip the output of an empty PipelineStage', async () => {
    const out = pipeline.skip(pipeline.empty(), 2)
    let cpt = 0
    out.subscribe(() => {
      cpt++
    })
    expect(cpt).to.equal(0)

  })

  it('should work if the skip is higher that the number of items emitted by a PipelineStage', async () => {
    const out = pipeline.skip(pipeline.of(1, 2, 3, 4, 5), 12)
    let cpt = 0
    out.subscribe(() => {
      cpt++
    })
    expect(cpt).to.equal(0)

  })

  // distinct method
  describe('#distinct', () => {
    it('should remove duplicated elements emitted by a PipelineStage', async () => {
      const out = pipeline.distinct(pipeline.of(1, 1, 2, 2, 3, 3))
      const expected = [1, 2, 3]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(3)
      expect(expected.length).to.equal(0)

    })

    it('should remove duplicated elements using a selector function', async () => {
      const out = pipeline.distinct(pipeline.of(1, 2, 3), x => (x === 2) ? 1 : x)
      const expected = [1, 3]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(2)
      expect(expected.length).to.equal(0)

    })
  })

  // forEach method
  describe('#forEach', () => {
    it('should invoke a callback on each item emitted by a PipelineStage', async () => {
      let cpt = 0
      const expected = [1, 2, 3]
      pipeline.forEach(pipeline.of(1, 2, 3), x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
        if (cpt === 3) {
          expect(expected.length).to.equal(0)
        }
      })
    })
  })

  // defaultValues method
  describe('#defaultValues', () => {
    it('should set a (single) default for an empty PipelineStage', async () => {
      const out = pipeline.defaultValues(pipeline.empty(), 1)
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.equal(1)
        cpt++
      })
      expect(cpt).to.equal(1)

    })
  })

  it('should set several default values for an empty PipelineStage', async () => {
    const out = pipeline.defaultValues(pipeline.empty(), 1, 2, 3)
    const expected = [1, 2, 3]
    let cpt = 0
    await asyncSubscribe(out, x => {
      expect(x).to.be.oneOf(expected)
      expected.splice(expected.indexOf(x), 1)
      cpt++
    })
    expect(cpt).to.equal(3)
    expect(expected.length).to.equal(0)

  })

  // bufferCount method
  describe('#bufferCount', () => {
    it('should buffer items emitted by a PipelineStage', async () => {
      const out = pipeline.bufferCount(pipeline.of(1, 2, 3, 4), 2)
      const expected = [1, 2, 3, 4]
      let cpt = 0
      await asyncSubscribe(out, chunk => {
        expect(chunk.length).to.equal(2)
        chunk.forEach(x => {
          expect(x).to.be.oneOf(expected)
          expected.splice(expected.indexOf(x), 1)
          cpt++
        })
      })
      expect(cpt).to.equal(4)
      expect(expected.length).to.equal(0)

    })
  })

  it('should buffer items even if the buffer size is higher that the total number of items produced', async () => {
    const out = pipeline.bufferCount(pipeline.of(1, 2, 3, 4), 5)
    const expected = [1, 2, 3, 4]
    let cpt = 0
    await asyncSubscribe(out, chunk => {
      expect(chunk.length).to.equal(4)
      chunk.forEach(x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
    })
    expect(cpt).to.equal(4)
    expect(expected.length).to.equal(0)

  })

  // collect method
  describe('#collect', () => {
    it('should collect all values emitted by a PipelineStage as an array', async () => {
      const out = pipeline.collect(pipeline.of(1, 2, 3, 4))
      const expected = [1, 2, 3, 4]
      let cpt = 0
      await asyncSubscribe(out, chunk => {
        expect(chunk.length).to.equal(4)
        chunk.forEach(x => {
          expect(x).to.be.oneOf(expected)
          expected.splice(expected.indexOf(x), 1)
        })
        cpt++
      })
      expect(cpt).to.equal(1)
      expect(expected.length).to.equal(0)

    })
  })

  it('should produce an empty array when applied to an empty PipelineStage', async () => {
    const out = pipeline.collect(pipeline.empty())
    let cpt = 0
    await asyncSubscribe(out, chunk => {
      expect(chunk.length).to.equal(0)
      cpt++
    })
    expect(cpt).to.equal(1)

  })

  // first method
  describe('#first', () => {
    it('should emit the first item of the PipelineStage', async () => {
      const out = pipeline.first(pipeline.of(1, 2))
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf([1, 2])
        cpt++
      })
      expect(cpt).to.equal(1)

    })
  })

  // endWith method
  describe('#endsWith', () => {
    it('should append items at the end of the PipelineStage', async () => {
      const out = pipeline.endWith(pipeline.empty(), [1, 2, 3, 4])
      const expected = [1, 2, 3, 4]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(4)
      expect(expected.length).to.equal(0)

    })
  })

  // tap method
  describe('#tap', () => {
    it('should invoke a function on each item in a PipelineStage, then forward the item', async () => {
      let nbTaps = 0
      const out = pipeline.tap(pipeline.of(1, 2, 3, 4), () => nbTaps++)
      const expected = [1, 2, 3, 4]
      let cpt = 0
      await asyncSubscribe(out, x => {
        expect(x).to.be.oneOf(expected)
        expected.splice(expected.indexOf(x), 1)
        cpt++
      })
      expect(cpt).to.equal(4)
      expect(nbTaps).to.equal(4)
      expect(expected.length).to.equal(0)

    })

    it('should not invoke the function when applied to an empty PipelineStage', async () => {
      let nbTaps = 0
      const out = pipeline.tap(pipeline.empty(), () => nbTaps++)
      let cpt = 0
      out.subscribe(() => {
        cpt++
      })
      expect(cpt).to.equal(0)
      expect(nbTaps).to.equal(0)

    })
  })

  describe('#otArray', () => {
    it('should produce empty array if no element', async () => {
      const out = pipeline.of()
      expect(await out.toArray()).toHaveLength(0)
    })

    it('should produce array of a single element', async () => {
      const out = pipeline.of(1)
      expect(await out.toArray()).toHaveLength(1)

    })

    it('should create a PipelineStage from several elements', async () => {
      const out = pipeline.of(1, 2, 3)
      const expected = [1, 2, 3]
      const results = await out.toArray()
      expect(results).toHaveLength(3)
      expect(results).toEqual(expected)

    })
  })
}

async function asyncSubscribe(out, onNext, onReject, onResolve) {
  return await new Promise((resolve, reject) => {
    out.subscribe(x => {
      onNext(x)
    }, (e) => {
      onReject && onReject(e)
      reject()
    }, () => {
      onResolve && onResolve()
      resolve()
    })
  })
}

module.exports = testPipelineEngine
