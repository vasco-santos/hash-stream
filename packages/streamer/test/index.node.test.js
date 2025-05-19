import fs from 'fs'
import os from 'os'
import path from 'path'

// FS Stores
import { FSIndexStore } from '@hash-stream/index/store/fs'
import { FSPackStore } from '@hash-stream/pack/store/fs'

// S3Like Stores
import { S3LikePackStore } from '@hash-stream/pack/store/s3-like'
import { S3LikeIndexStore } from '@hash-stream/index/store/s3-like'

import { runHashStreamTests } from './hash-streamer.js'

import { createS3Like, createBucket } from './helpers/resources.js'
;[
  {
    name: 'FS',
    /**
     * @returns {Promise<import('./hash-streamer.js').DestroyableIndexStore>}
     */
    getIndexStore: () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-index-test-'))
      const indexStore = new FSIndexStore(tempDir)
      const destroyableIndexStore = Object.assign(indexStore, {
        directory: tempDir,
        destroy: () => {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
          }
        },
      })
      return Promise.resolve(destroyableIndexStore)
    },
    /**
     * @returns {Promise<import('./hash-streamer.js').DestroyablePackStore>}
     */
    getPackStore: () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-pack-test-'))
      const packStore = new FSPackStore(tempDir)
      const destroyablePackStore = Object.assign(packStore, {
        directory: tempDir,
        destroy: () => {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
          }
        },
      })
      return Promise.resolve(destroyablePackStore)
    },
  },
  {
    name: 'S3Like',
    /**
     * @returns {Promise<import('./hash-streamer.js').DestroyablePackStore>}
     */
    getPackStore: async () => {
      const { client } = await createS3Like()
      const bucketName = await createBucket(client)
      const packStore = new S3LikePackStore({
        bucketName,
        client,
      })
      const destroyablePackStore = Object.assign(packStore, {
        directory: bucketName,
        destroy: () => {},
      })
      return destroyablePackStore
    },
    /**
     * @returns {Promise<import('./hash-streamer.js').DestroyableIndexStore>}
     */
    getIndexStore: async () => {
      const { client } = await createS3Like()
      const bucketName = await createBucket(client)
      const packStore = new S3LikeIndexStore({
        bucketName,
        client,
      })
      const destroyablePackStore = Object.assign(packStore, {
        directory: bucketName,
        destroy: () => {},
      })
      return destroyablePackStore
    },
  },
].forEach(({ name, getIndexStore, getPackStore }) => {
  runHashStreamTests(
    name,
    () => getIndexStore(),
    () => getPackStore()
  )
})
