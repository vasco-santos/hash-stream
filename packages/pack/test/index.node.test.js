import fs from 'fs'
import path from 'path'
import os from 'os'

import { FSPackStore } from '../src/store/fs.js'
import { S3LikePackStore } from '../src/store/s3-like.js'

import { runPackTests } from './pack.js'

import { createS3Like, createBucket } from './helpers/resources.js'
;[
  {
    name: 'FS',
    /**
     * @returns {Promise<import('./pack.js').DestroyablePackStore>}
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
  },
].forEach(({ name, getPackStore }) => {
  runPackTests(name, () => getPackStore())
})
