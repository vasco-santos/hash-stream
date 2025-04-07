import fs from 'fs'
import path from 'path'
import os from 'os'

// Index Store
import { FSIndexStore } from '../src/store/fs.js'
import { S3LikeIndexStore } from '../src/store/s3-like.js'
import { CloudflareWorkerBucketIndexStore } from '../src/store/cf-worker-bucket.js'

import { runIndexStoreTests } from './store.js'
import {
  createS3Like,
  createBucket,
  createCloudflareWorkerBucket,
} from './helpers/resources.js'

describe('IndexStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'FS',
      /**
       * @returns {Promise<import('./store.js').DestroyableIndexStore>}
       */
      getIndexStore: () => {
        const tempDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'fs-index-store-')
        )
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
       * @returns {Promise<import('./store.js').DestroyableIndexStore>}
       */
      getIndexStore: async () => {
        const { client } = await createS3Like()
        const bucketName = await createBucket(client)
        const indexStore = new S3LikeIndexStore({
          bucketName,
          client,
        })
        const destroyableIndexStore = Object.assign(indexStore, {
          destroy: () => {},
        })
        return Promise.resolve(destroyableIndexStore)
      },
    },
    {
      name: 'Cloudflare Worker Bucket',
      /**
       * @returns {Promise<import('./store.js').DestroyableIndexStore>}
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
  ].forEach(({ name, getIndexStore }) => {
    runIndexStoreTests(name, () => getIndexStore())
  })
})
