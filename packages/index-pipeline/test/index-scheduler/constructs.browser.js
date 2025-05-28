/* global setTimeout */

import * as API from '../../src/api.js'

import { MemoryIndexScheduler } from '../../src/index-scheduler/memory.js'

export const getMemoryScheduler = async () => {
  /** @type {API.QueuedIndexTask[]} */
  const queue = []
  const scheduler = new MemoryIndexScheduler(queue)
  return Object.assign(scheduler, {
    destroy: () => {},
    async *drain() {
      while (queue.length) {
        await new Promise((resolve) => setTimeout(resolve, 0))
        const task = queue.shift()
        if (task) yield task
      }
    },
  })
}
