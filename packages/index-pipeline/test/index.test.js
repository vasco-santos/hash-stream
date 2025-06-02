import { MemoryPackStore } from '@hash-stream/pack/store/memory'
import { MemoryIndexStore } from '@hash-stream/index/store/memory'
import { MultipleLevelIndexWriter, IndexReader } from '@hash-stream/index'

import { runIndexPipelineTests } from './index.js'

import { getMemoryStore } from './file-store/constructs.browser.js'
import { createMemoryScheduler } from './index-scheduler/constructs.browser.js'

describe('indexPipeline combinations', () => {
  let indexStore = new MemoryIndexStore()

  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'MemoryFileStore + MemoryIndexScheduler',
      getFileStore: getMemoryStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(new MemoryPackStore(), {
            destroy: () => {},
          })
        ),
      /**
       * @returns {Promise<API.IndexScheduler & { destroy(): void, drain(): AsyncGenerator<API.QueuedIndexTask> }>}
       */
      getIndexScheduler: createMemoryScheduler,
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexWriter[]>}
       */
      createIndexWriters: () => {
        return Promise.resolve([new MultipleLevelIndexWriter(indexStore)])
      },
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexReader>}
       */
      createIndexReader: () => {
        return Promise.resolve(new IndexReader(indexStore))
      },
    },
  ].forEach(
    ({
      name,
      getFileStore,
      getIndexScheduler,
      createIndexWriters,
      createIndexReader,
      createPackStoreWriter,
    }) => {
      runIndexPipelineTests(
        name,
        getFileStore,
        getIndexScheduler,
        createIndexWriters,
        createIndexReader,
        createPackStoreWriter
      )
    }
  )
})
