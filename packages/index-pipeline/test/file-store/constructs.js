import fs from 'fs'
import path from 'path'
import os from 'os'

import { FSFileStore } from '../../src/file-store/fs.js'
import { S3LikeFileStore } from '../../src/file-store/s3-like.js'
import { CloudflareWorkerBucketFileStore } from '../../src/file-store/cf-worker-bucket.js'

import { PutObjectCommand } from '@aws-sdk/client-s3'

import {
  createS3Like,
  createBucket,
  createCloudflareWorkerBucket,
} from '../helpers/resources.js'

export const getS3LikeFileStore = async () => {
  const { client } = await createS3Like()
  const bucketName = await createBucket(client)
  const store = new S3LikeFileStore({ bucketName, client })
  return Object.assign(store, {
    destroy: () => {},
    /**
     * @param {string} key
     * @param {Uint8Array} bytes
     */
    async put(key, bytes) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: bytes,
        })
      )
    },
  })
}

export const getCloudflareWorkerBucketStore = async () => {
  const { mf, bucket } = await createCloudflareWorkerBucket()
  const store = new CloudflareWorkerBucketFileStore({ bucket })
  return Object.assign(store, {
    destroy: async () => {
      await mf.dispose()
    },
    /**
     * @param {string} key
     * @param {Uint8Array} bytes
     */
    async put(key, bytes) {
      await bucket.put(key, bytes)
    },
  })
}

export const getFsStore = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-index-store-'))
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
}
