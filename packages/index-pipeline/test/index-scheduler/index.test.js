/* global setTimeout */

import * as API from '../../src/api.js'

import { MemoryIndexScheduler } from '../../src/index-scheduler/memory.js'
import { runIndexSchedulerTests } from './index.js'

describe('IndexScheduler implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'Memory',
      /**
       * @returns {Promise<import('./index.js').DestroyableAndDrainableIndexScheduler>}
       */
      getIndexScheduler: () => {
        /** @type {API.QueuedIndexTask[]} */
        const queuedIndexTasks = []
        const indexScheduler = new MemoryIndexScheduler(queuedIndexTasks)
        const indexSchedulerImplementation = Object.assign(indexScheduler, {
          destroy: () => {},
          /**
           * @returns {AsyncGenerator<API.QueuedIndexTask>}
           */
          async *drain() {
            while (queuedIndexTasks.length) {
              // Simulate async delay
              await new Promise((resolve) => setTimeout(resolve, 0))
              const task = queuedIndexTasks.shift()
              if (task) {
                yield task
              }
            }
          },
        })
        return Promise.resolve(indexSchedulerImplementation)
      },
    },
  ].forEach(({ name, getIndexScheduler }) => {
    runIndexSchedulerTests(name, () => getIndexScheduler())
  })
})
