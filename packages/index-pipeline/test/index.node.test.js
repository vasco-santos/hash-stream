import { runIndexPipelineTests } from './index.js'

import { MemoryIndexStore } from '@hash-stream/index/store/memory'
import { MemoryPackStore } from '@hash-stream/pack/store/memory'
import { MultipleLevelIndexWriter, IndexReader } from '@hash-stream/index'

import {
  getS3LikeFileStore,
  getCloudflareWorkerBucketStore,
  getFsStore,
} from './file-store/constructs.js'
import { createSQSLikeScheduler } from './index-scheduler/constructs.js'
import { createMemoryScheduler } from './index-scheduler/constructs.browser.js'

describe('indexPipeline combinations', () => {
  let indexStore = new MemoryIndexStore()
  let packStore = new MemoryPackStore()

  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'S3Like + SQSLike',
      createFileStore: getS3LikeFileStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(packStore, {
            destroy: () => {
              packStore = new MemoryPackStore()
            },
          })
        ),
      createIndexScheduler: createSQSLikeScheduler,
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexWriter[]>}
       */
      createIndexWriters: () => {
        indexStore = new MemoryIndexStore()
        return Promise.resolve([new MultipleLevelIndexWriter(indexStore)])
      },
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexReader>}
       */
      createIndexReader: () => {
        return Promise.resolve(new IndexReader(indexStore))
      },
    },
    {
      name: 'S3Like + Memory',
      createFileStore: getS3LikeFileStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(packStore, {
            destroy: () => {
              packStore = new MemoryPackStore()
            },
          })
        ),
      createIndexScheduler: createMemoryScheduler,
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexWriter[]>}
       */
      createIndexWriters: () => {
        indexStore = new MemoryIndexStore()
        return Promise.resolve([new MultipleLevelIndexWriter(indexStore)])
      },
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexReader>}
       */
      createIndexReader: () => {
        return Promise.resolve(new IndexReader(indexStore))
      },
    },
    {
      name: 'Cloudflare Worker Bucket + SQSLike',
      createFileStore: getCloudflareWorkerBucketStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(packStore, {
            destroy: () => {
              packStore = new MemoryPackStore()
            },
          })
        ),
      createIndexScheduler: createSQSLikeScheduler,
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexWriter[]>}
       */
      createIndexWriters: () => {
        indexStore = new MemoryIndexStore()
        return Promise.resolve([new MultipleLevelIndexWriter(indexStore)])
      },
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexReader>}
       */
      createIndexReader: () => {
        return Promise.resolve(new IndexReader(indexStore))
      },
    },
    {
      name: 'Cloudflare Worker Bucket + Memory',
      createFileStore: getCloudflareWorkerBucketStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(packStore, {
            destroy: () => {
              packStore = new MemoryPackStore()
            },
          })
        ),
      createIndexScheduler: createMemoryScheduler,
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexWriter[]>}
       */
      createIndexWriters: () => {
        indexStore = new MemoryIndexStore()
        return Promise.resolve([new MultipleLevelIndexWriter(indexStore)])
      },
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexReader>}
       */
      createIndexReader: () => {
        return Promise.resolve(new IndexReader(indexStore))
      },
    },
    {
      name: 'FS + SQSLike',
      createFileStore: getFsStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(packStore, {
            destroy: () => {
              packStore = new MemoryPackStore()
            },
          })
        ),
      createIndexScheduler: createSQSLikeScheduler,
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexWriter[]>}
       */
      createIndexWriters: () => {
        indexStore = new MemoryIndexStore()
        return Promise.resolve([new MultipleLevelIndexWriter(indexStore)])
      },
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexReader>}
       */
      createIndexReader: () => {
        return Promise.resolve(new IndexReader(indexStore))
      },
    },
    {
      name: 'FS + Memory',
      createFileStore: getFsStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(packStore, {
            destroy: () => {
              packStore = new MemoryPackStore()
            },
          })
        ),
      createIndexScheduler: createMemoryScheduler,
      /**
       * @returns {Promise<import('@hash-stream/index/types').IndexWriter[]>}
       */
      createIndexWriters: () => {
        indexStore = new MemoryIndexStore()
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
      createFileStore,
      createIndexScheduler,
      createPackStoreWriter,
      createIndexWriters,
      createIndexReader,
    }) => {
      runIndexPipelineTests(
        name,
        createFileStore,
        createIndexScheduler,
        createIndexWriters,
        createIndexReader,
        createPackStoreWriter
      )
    }
  )
})
