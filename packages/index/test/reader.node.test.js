import fs from 'fs'
import path from 'path'
import os from 'os'

// Index Store
import { FSIndexStore } from '../src/store/fs.js'
import { S3LikeIndexStore } from '../src/store/s3-like.js'

// Reader
import { IndexReader } from '../src/reader.js'

import { runIndexReaderTests } from './reader.js'
import { createS3Like, createBucket } from './helpers/resources.js'

describe('Index Reader implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'with FS Store',
      /**
       * @returns {Promise<import('./reader.js').DestroyableIndexReader>}
       */
      getIndexReader: () => {
        const tempDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'fs-index-store-')
        )
        const indexStore = new FSIndexStore(tempDir)
        const indexReader = new IndexReader(indexStore)

        const destroyableIndexReader = Object.assign(indexReader, {
          destroy: () => {
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true })
            }
          },
          storeWriter: indexStore,
        })
        return Promise.resolve(destroyableIndexReader)
      },
    },
    {
      name: 'with S3Like Store',
      /**
       * @returns {Promise<import('./reader.js').DestroyableIndexReader>}
       */
      getIndexReader: async () => {
        const { client } = await createS3Like()
        const bucketName = await createBucket(client)
        const indexStore = new S3LikeIndexStore({
          bucketName,
          client,
        })
        const indexReader = new IndexReader(indexStore)
        const destroyableIndexReader = Object.assign(indexReader, {
          destroy: () => {},
          storeWriter: indexStore,
        })
        return Promise.resolve(destroyableIndexReader)
      },
    },
  ].forEach(({ name, getIndexReader }) => {
    runIndexReaderTests(name, () => getIndexReader())
  })
})
