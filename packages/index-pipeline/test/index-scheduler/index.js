import * as API from '../../src/api.js'

import assert from 'assert'

/**
 * @typedef {object} DestroyableAndDrainable
 * @property {() => void} destroy
 * @property {() => AsyncGenerator<API.QueuedIndexTask>} drain
 *
 * @typedef {API.IndexScheduler & DestroyableAndDrainable} DestroyableAndDrainableIndexScheduler
 */

/**
 * Runs the test suite for the Index Scheduler.
 *
 * @param {string} schedulerName - The name of the scheduler (e.g., "Memory", "SQS").
 * @param {() => Promise<DestroyableAndDrainableIndexScheduler>} createIndexScheduler - Function to create the index scheduler.
 */
export function runIndexSchedulerTests(schedulerName, createIndexScheduler) {
  describe(`${schedulerName} IndexScheduler`, () => {
    /** @type {DestroyableAndDrainableIndexScheduler} */
    let store

    beforeEach(async () => {
      store = await createIndexScheduler()
    })

    afterEach(() => {
      store.destroy()
    })

    it('can schedule', async () => {
      const fileReference = 'example.txt'

      await store.add(fileReference)

      const drained = []
      for await (const task of store.drain()) {
        drained.push(task)
      }

      assert.strictEqual(drained.length, 1)
      assert.strictEqual(drained[0].fileReference, fileReference)
    })

    it('can schedule with metadata options', async () => {
      const fileRef = 'test/file.txt'
      const options = { format: 'unixfs', size: 12345 }

      await store.add(fileRef, options)

      const drained = []
      for await (const task of store.drain()) {
        drained.push(task)
      }

      assert.strictEqual(drained.length, 1)
      assert.strictEqual(drained[0].fileReference, fileRef)
      assert.strictEqual(drained[0].options?.format, options.format)
      assert.strictEqual(drained[0].options?.size, options.size)
    })
  })
}
