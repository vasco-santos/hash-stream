import fs from 'fs'
import path from 'path'
import os from 'os'

// Blob Index Store
import { FSBlobIndexStore } from '../src/store/fs-blob.js'
import { S3LikeBlobIndexStore } from '../src/store/s3-like-blob.js'

// Containing Index Store
import { FSContainingIndexStore } from '../src/store/fs-containing.js'
import { S3LikeContainingIndexStore } from '../src/store/s3-like-containing.js'

import { runBlobStoreTests } from './stores/blob.js'
import { runContainingStoreTests } from './stores/containing.js'
import { createS3Like, createBucket } from './helpers/resources.js'

describe('BlobIndexStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'FS',
      /**
       * @returns {Promise<import('./stores/blob.js').DestroyableIndexStore>}
       */
      getIndexStore: () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-index-blob-'))
        const indexStore = new FSBlobIndexStore(tempDir)
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
       * @returns {Promise<import('./stores/blob.js').DestroyableIndexStore>}
       */
      getIndexStore: async () => {
        const { client } = await createS3Like()
        const bucketName = await createBucket(client)
        const indexStore = new S3LikeBlobIndexStore({
          bucketName,
          client,
        })
        const destroyableIndexStore = Object.assign(indexStore, {
          destroy: () => {},
        })
        return Promise.resolve(destroyableIndexStore)
      },
    },
  ].forEach(({ name, getIndexStore }) => {
    runBlobStoreTests(name, () => getIndexStore())
  })
})

describe('ContainingIndexStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'FS',
      /**
       * @returns {Promise<import('./stores/blob.js').DestroyableIndexStore>}
       */
      getIndexStore: () => {
        const tempDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'fs-index-containing-')
        )
        const indexStore = new FSContainingIndexStore(tempDir)
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
       * @returns {Promise<import('./stores/blob.js').DestroyableIndexStore>}
       */
      getIndexStore: async () => {
        const { client } = await createS3Like()
        const bucketName = await createBucket(client)
        const indexStore = new S3LikeContainingIndexStore({
          bucketName,
          client,
        })
        const destroyableIndexStore = Object.assign(indexStore, {
          destroy: () => {},
        })
        return Promise.resolve(destroyableIndexStore)
      },
    },
  ].forEach(({ name, getIndexStore }) => {
    runContainingStoreTests(name, () => getIndexStore())
  })
})
