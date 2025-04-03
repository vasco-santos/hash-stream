import fs from 'fs'
import path from 'path'
import os from 'os'

// FS Stores
import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'
import { FSPackStore } from '../src/store/fs.js'

// S3Like Stores
import { S3LikePackStore } from '../src/store/s3-like.js'
import { S3LikeContainingIndexStore } from '@hash-stream/index/store/s3-like-containing'

import { runPackWriterTests } from './writer.js'

import { createS3Like, createBucket } from './helpers/resources.js'
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
     * @returns {Promise<import('./pack.js').DestroyablePackStore>}
     */
    getPackStore: async () => {
      const { client } = await createS3Like()
      const bucketName = await createBucket(client)
      const packStore = new S3LikePackStore({
        bucketName,
        client,
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
      const packStore = new S3LikeContainingIndexStore({
        bucketName,
        client,
      })
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {},
      })
      return destroyablePackStore
    },
  },
].forEach(({ name, getPackStore, getIndexStore }) => {
  runPackWriterTests(
    name,
    () => getPackStore(),
    () => getIndexStore()
  )
})
