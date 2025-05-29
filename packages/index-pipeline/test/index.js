import * as API from '../src/api.js'

import assert from 'assert'
import all from 'it-all'

import { Type } from '@hash-stream/index/record'
import {
  scheduleStoreFilesForIndexing,
  processFileForIndexing,
} from '../src/index.js'

/**
 * @typedef {object} DestroyableAndDrainable
 * @property {() => void} destroy
 * @property {() => AsyncGenerator<API.QueuedIndexTask>} drain
 *
 * @typedef {object} DestroyableAndUpdatable
 * @property {(key: string, bytes: Uint8Array) => Promise<void>} put
 * @property {() => void} destroy
 *
 * @typedef {API.IndexScheduler & DestroyableAndDrainable} DestroyableAndDrainableIndexScheduler
 * @typedef {API.FileStore & DestroyableAndUpdatable} DestroyableAndUpdatableFileStore
 */

/**
 * Runs integration tests for the full index pipeline, from scheduling to processing.
 *
 * It takes combinations of FileStore and IndexScheduler implementations, injects test files,
 * schedules them, drains the tasks, and runs the indexing processor on each.
 *
 * @param {string} pipelineName - A name for this test suite (e.g., "Memory→Memory", "S3→SQS").
 * @param {() => Promise<DestroyableAndUpdatableFileStore>} createFileStore - Factory for FileStore instance.
 * @param {(messageTarget: number) => Promise<DestroyableAndDrainableIndexScheduler>} createIndexScheduler - Factory for IndexScheduler instance.
 * @param {() => Promise<import('@hash-stream/index/types').IndexWriter[]>} createIndexWriters - Array of writers to use for actual indexing (can be mocks).
 * @param {() => Promise<import('@hash-stream/index/types').IndexReader>} createIndexReader - Index reader to test writer behaviour.
 */
export function runIndexPipelineTests(
  pipelineName,
  createFileStore,
  createIndexScheduler,
  createIndexWriters,
  createIndexReader
) {
  describe(`IndexPipeline [${pipelineName}]`, () => {
    /** @type {DestroyableAndUpdatableFileStore} */
    let fileStore
    /** @type {DestroyableAndDrainableIndexScheduler} */
    let scheduler
    /** @type {import('@hash-stream/index/types').IndexWriter[]} */
    let indexWriters
    /** @type {import('@hash-stream/index/types').IndexReader} */
    let indexReader

    const testFiles = [
      {
        key: 'file1.txt',
        size: 12,
        content: new TextEncoder().encode('hello world'),
      },
      {
        key: 'file2.txt',
        size: 20,
        content: new TextEncoder().encode('Another test file'),
      },
    ]

    beforeEach(async () => {
      fileStore = await createFileStore()
      indexWriters = await createIndexWriters()
      indexReader = await createIndexReader()
    })

    // Pre-populate FileStore
    beforeEach(async () => {
      for (const file of testFiles) {
        await fileStore.put(file.key, file.content)
      }
    })

    afterEach(() => {
      scheduler && scheduler.destroy()
      fileStore.destroy()
    })

    it('can schedule and index all files from the FileStore', async () => {
      scheduler = await createIndexScheduler(2)

      // Step 1: Schedule
      const scheduledItems = await all(
        scheduleStoreFilesForIndexing(fileStore, scheduler)
      )
      assert(scheduledItems)
      assert.equal(scheduledItems.length, testFiles.length)
      for (const scheduledItem of scheduledItems) {
        assert(testFiles.find((testFile) => testFile.key === scheduledItem))
      }

      // Step 2: Drain & Index
      const indexedFiles = []
      for await (const task of scheduler.drain()) {
        const mh = await processFileForIndexing(
          fileStore,
          indexWriters,
          task.options?.format || 'unixfs',
          task.fileReference
        )
        assert(mh)
        indexedFiles.push({
          key: task.fileReference,
          multihash: mh,
          fileReference: task.fileReference,
        })
      }

      assert.strictEqual(indexedFiles.length, testFiles.length)
      const keys = indexedFiles.map((f) => f.key).sort()
      assert.deepStrictEqual(keys, testFiles.map((f) => f.key).sort())

      for (const indexedFile of indexedFiles) {
        const indexRecords = await all(
          indexReader.findRecords(indexedFile.multihash)
        )
        assert(indexRecords)
        assert.equal(indexRecords.length, 1)
        const containingRecord = indexRecords[0]
        assert.equal(containingRecord.type, Type.CONTAINING)
        assert.equal(containingRecord.subRecords.length, 1)
        const blobRecord = containingRecord.subRecords[0]
        assert.equal(blobRecord.type, Type.BLOB)
        assert.equal(indexedFile.fileReference, blobRecord.location)
      }
    })

    it('throws when file is missing from FileStore', async () => {
      scheduler = await createIndexScheduler(1)
      await scheduler.add('missing-file.txt', { format: 'unixfs', size: 0 })

      try {
        for await (const task of scheduler.drain()) {
          await processFileForIndexing(
            fileStore,
            indexWriters,
            task.options?.format || 'unixfs',
            task.fileReference
          )
        }
        assert.fail('Expected error for missing file')
      } catch (/** @type {any} */ err) {
        assert.ok(err.message.includes('File not found: missing-file.txt'))
      }
    })

    it('throws for unsupported index format', async () => {
      scheduler = await createIndexScheduler(1)
      await scheduler.add('file1.txt', { format: 'unsupported', size: 0 })

      try {
        for await (const task of scheduler.drain()) {
          await processFileForIndexing(
            fileStore,
            indexWriters,
            task.options?.format || 'unsupported',
            task.fileReference
          )
        }
        assert.fail('Expected error for unsupported format')
      } catch (/** @type {any} */ err) {
        assert.ok(err.message.includes('Unsupported index format'))
      }
    })
  })
}
