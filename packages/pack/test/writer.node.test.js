import fs from 'fs'
import path from 'path'
import os from 'os'

// FS Stores
import { FSIndexStore } from '@hash-stream/index/store/fs'
import { FSPackStore } from '../src/store/fs.js'

// S3Like Stores
import { S3LikeIndexStore } from '@hash-stream/index/store/s3-like'
import { S3LikePackStore } from '../src/store/s3-like.js'

// Worker like Stores
import { CloudflareWorkerBucketIndexStore } from '@hash-stream/index/store/cf-worker-bucket'
import { CloudflareWorkerBucketPackStore } from '../src/store/cf-worker-bucket.js'

import { runPackWriterTests } from './writer.js'

import {
  createS3Like,
  createBucket,
  createCloudflareWorkerBucket,
} from './helpers/resources.js'
;[
  {
    name: 'FS',
    /**
     * @returns {Promise<import('./writer.js').DestroyablePackStore>}
     */
    getPackStore: () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-pack-test-'))
      const packStore = new FSPackStore(tempDir)
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
          }
        },
      })
      return Promise.resolve(destroyablePackStore)
    },
    /**
     * @returns {Promise<import('./writer.js').DestroyableIndexStore>}
     */
    getIndexStore: () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-index-test-'))
      const indexStore = new FSIndexStore(tempDir)
      const destroyableIndexStore = Object.assign(indexStore, {
        destroy: () => {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
          }
        },
      })
      return Promise.resolve(destroyableIndexStore)
    },
  },
  {
    name: 'S3Like',
    /**
     * @returns {Promise<import('./pack.js').DestroyablePackStore>}
     */
    getPackStore: async () => {
      const { client } = await createS3Like()
      const bucketName = await createBucket(client)
      const packStore = new S3LikePackStore({
        bucketName,
        client,
        getObjectOptionsForRangeRequests: {
          // Needed because range GET won't be the entire file
          ChecksumMode: 'DISABLED',
        },
      })
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {},
      })
      return destroyablePackStore
    },
    /**
     * @returns {Promise<import('./writer.js').DestroyableIndexStore>}
     */
    getIndexStore: async () => {
      const { client } = await createS3Like()
      const bucketName = await createBucket(client)
      const packStore = new S3LikeIndexStore({
        bucketName,
        client,
      })
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {},
      })
      return destroyablePackStore
    },
  },
  {
    name: 'Cloudflare Worker Bucket',
    /**
     * @returns {Promise<import('./writer.js').DestroyablePackStore>}
     */
    getPackStore: async () => {
      const { mf, bucket } = await createCloudflareWorkerBucket()
      const packStore = new CloudflareWorkerBucketPackStore({ bucket })
      const destroyablePackStore = Object.assign(packStore, {
        destroy: async () => {
          await mf.dispose()
        },
      })
      return Promise.resolve(destroyablePackStore)
    },
    /**
     * @returns {Promise<import('./writer.js').DestroyableIndexStore>}
     */
    getIndexStore: async () => {
      const { mf, bucket } = await createCloudflareWorkerBucket()
      const indexStore = new CloudflareWorkerBucketIndexStore({ bucket })
      const destroyableIndexStore = Object.assign(indexStore, {
        destroy: async () => {
          await mf.dispose()
        },
      })
      return Promise.resolve(destroyableIndexStore)
    },
  },
].forEach(({ name, getPackStore, getIndexStore }) => {
  runPackWriterTests(
    name,
    () => getPackStore(),
    () => getIndexStore()
  )
})
