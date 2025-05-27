import fs from 'fs'
import path from 'path'
import os from 'os'

import { PutObjectCommand } from '@aws-sdk/client-s3'

// File Store
import { FSFileStore } from '../../src/file-store/fs.js'
import { S3LikeFileStore } from '../../src/file-store/s3-like.js'
import { CloudflareWorkerBucketFileStore } from '../../src/file-store/cf-worker-bucket.js'

import { runFileStoreTests } from './index.js'
import {
  createS3Like,
  createBucket,
  createCloudflareWorkerBucket,
} from '../helpers/resources.js'

describe('FileStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'FS',
      /**
       * @returns {Promise<import('./index.js').DestroyableAndUpdatableFileStore>}
       */
      getFileStore: () => {
        const tempDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'fs-index-store-')
        )
        const fileStore = new FSFileStore(tempDir)
        const fileStoreImplementation = Object.assign(fileStore, {
          destroy: () => {
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true })
            }
          },
          /**
           * @param {string} key
           * @param {Uint8Array} bytes
           */
          put: async (key, bytes) => {
            const filePath = path.join(tempDir, key)
            const dirPath = path.dirname(filePath)
            fs.mkdirSync(dirPath, { recursive: true })
            fs.writeFileSync(filePath, bytes)
          },
        })
        return Promise.resolve(fileStoreImplementation)
      },
    },
    {
      name: 'S3Like',
      /**
       * @returns {Promise<import('./index.js').DestroyableAndUpdatableFileStore>}
       */
      getFileStore: async () => {
        const { client } = await createS3Like()
        const bucketName = await createBucket(client)
        const fileStore = new S3LikeFileStore({
          bucketName,
          client,
        })
        const fileStoreImplementation = Object.assign(fileStore, {
          destroy: () => {},
          /**
           * @param {string} key
           * @param {Uint8Array} bytes
           */
          put: async (key, bytes) => {
            await client.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: bytes,
              })
            )
          },
        })
        return Promise.resolve(fileStoreImplementation)
      },
    },
    {
      name: 'Cloudflare Worker Bucket',
      /**
       * @returns {Promise<import('./index.js').DestroyableAndUpdatableFileStore>}
       */
      getFileStore: async () => {
        const { mf, bucket } = await createCloudflareWorkerBucket()
        const fileStore = new CloudflareWorkerBucketFileStore({ bucket })
        const fileStoreImplementation = Object.assign(fileStore, {
          destroy: async () => {
            await mf.dispose()
          },
          /**
           * @param {string} key
           * @param {Uint8Array} bytes
           */
          put: async (key, bytes) => {
            // Simulate storing bytes in memory
            await bucket.put(key, bytes)
          },
        })
        return Promise.resolve(fileStoreImplementation)
      },
    },
  ].forEach(({ name, getFileStore }) => {
    runFileStoreTests(name, () => getFileStore())
  })
})
