import { runIndexPipelineTests } from './index.js'

import { MemoryIndexStore } from '@hash-stream/index/store/memory'
import { MemoryPackStore } from '@hash-stream/pack/store/memory'
import { MultipleLevelIndexWriter, IndexReader } from '@hash-stream/index'

import {
  getS3LikeFileStore,
  getCloudflareWorkerBucketStore,
  getFsStore,
} from './file-store/constructs.js'
import { getSQSLikeScheduler } from './index-scheduler/constructs.js'
import { getMemoryScheduler } from './index-scheduler/constructs.browser.js'

describe('indexPipeline combinations', () => {
  let indexStore = new MemoryIndexStore()

  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'S3Like + SQSLike',
      getFileStore: getS3LikeFileStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(new MemoryPackStore(), {
            destroy: () => {},
          })
        ),
      getIndexScheduler: getSQSLikeScheduler,
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
      getFileStore: getS3LikeFileStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(new MemoryPackStore(), {
            destroy: () => {},
          })
        ),
      getIndexScheduler: getMemoryScheduler,
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
      getFileStore: getCloudflareWorkerBucketStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(new MemoryPackStore(), {
            destroy: () => {},
          })
        ),
      getIndexScheduler: getSQSLikeScheduler,
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
      getFileStore: getCloudflareWorkerBucketStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(new MemoryPackStore(), {
            destroy: () => {},
          })
        ),
      getIndexScheduler: getMemoryScheduler,
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
      getFileStore: getFsStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(new MemoryPackStore(), {
            destroy: () => {},
          })
        ),
      getIndexScheduler: getSQSLikeScheduler,
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
      getFileStore: getFsStore,
      createPackStoreWriter: () =>
        Promise.resolve(
          Object.assign(new MemoryPackStore(), {
            destroy: () => {},
          })
        ),
      getIndexScheduler: getMemoryScheduler,
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
      getFileStore,
      getIndexScheduler,
      createPackStoreWriter,
      createIndexWriters,
      createIndexReader,
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
