/* file : pipeline.ts
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

import { PipelineEngine } from './pipeline-engine'
import RxjsPipeline from './rxjs-pipeline'

// current pipeline engine used for processing bindings
let _currentEngine: PipelineEngine = new RxjsPipeline()

/**
 * Singleton class used to access the current pipeline engine
 * @author Thomas Minier
 */
export class Pipeline {
  /**
   * Get the instance of the current pipeline engine
   * @return The instance of the current pipeline engine
   */
  static getInstance(): PipelineEngine {
    return _currentEngine
  }

  /**
   * Set the instance of the current pipeline engine
   * @param instance  - New pipeline engine to use as the current one
   */
  static setInstance(instance: PipelineEngine): void {
    _currentEngine = instance
  }
}
