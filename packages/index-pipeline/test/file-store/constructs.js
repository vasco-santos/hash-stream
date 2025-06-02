import fs from 'fs'
import path from 'path'
import os from 'os'

import { sha256 } from 'multiformats/hashes/sha2'

import { FSFileStore } from '../../src/file-store/fs.js'
import { S3LikeFileStore } from '../../src/file-store/s3-like.js'
import { CloudflareWorkerBucketFileStore } from '../../src/file-store/cf-worker-bucket.js'

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

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
    /**
     * Retrieves bytes of a pack file from S3 by its multihash digest and streams it in specified ranges.
     *
     * @param {import('@hash-stream/pack/types').MultihashDigest | import('@hash-stream/pack/types').Path} target - The Multihash digest of the pack or its path.
     * @param {Array<{ offset?: number, length?: number, multihash: import('@hash-stream/pack/types').MultihashDigest }>} [ranges]
     * @returns {AsyncIterable<import('@hash-stream/pack/types').VerifiableEntry>}
     */
    async *stream(target, ranges = []) {
      if (typeof target !== 'string') {
        throw new Error('only string paths are supported for S3LikeFileStore')
      }

      // If no ranges, stream the entire file
      if (ranges.length === 0) {
        try {
          const { Body } = await client.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: target,
            })
          )
          /* c8 ignore next 1 */
          if (!Body) return

          const bytes = new Uint8Array(await Body.transformToByteArray())
          let multihash
          if (typeof target === 'string') {
            // If target is a path, we need to calculate the hash
            multihash = await sha256.digest(bytes)
          }
          // If target is a multihash, we can use it directly
          else {
            multihash = target
          }
          yield { multihash, bytes }
        } catch (/** @type {any} */ err) {
          /* c8 ignore next 1 */
          if (err.name !== 'NoSuchKey') throw err
        }
        return
      }

      // Handle ranged reads
      for (const { multihash, offset, length } of ranges) {
        try {
          const computedOffset = offset ?? 0
          /* c8 ignore next 11 */
          const rangeHeader = `bytes=${computedOffset}-${
            length ? computedOffset + length - 1 : ''
          }`
          const { Body } = await client.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: target,
              Range: rangeHeader,
              // Needed because range GET won't be the entire file
              // @ts-expect-error
              ChecksumMode: 'DISABLED',
            })
          )
          /* c8 ignore next 1 */
          if (!Body) continue

          const buffer = new Uint8Array(await Body.transformToByteArray())
          yield { multihash, bytes: buffer }
        } catch (/** @type {any} */ err) {
          /* c8 ignore next 1 */
          if (err.name !== 'NoSuchKey') throw err
        }
      }
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
    /**
     * Retrieves bytes of a pack file from R2 by its multihash digest or path and streams it in specified ranges.
     *
     * @param {import('@hash-stream/pack/types').MultihashDigest | import('@hash-stream/pack/types').Path} target - The Multihash digest of the pack or its path.
     * @param {Array<{ offset?: number, length?: number, multihash: import('@hash-stream/pack/types').MultihashDigest }>} [ranges]
     * @returns {AsyncIterable<import('@hash-stream/pack/types').VerifiableEntry>}
     */
    async *stream(target, ranges = []) {
      if (typeof target !== 'string') {
        throw new Error('only string paths are supported for S3LikeFileStore')
      }

      // If no ranges, stream the entire file
      if (ranges.length === 0) {
        const r2ObjectBody = await bucket.get(target)
        if (!r2ObjectBody) return

        const buffer = await r2ObjectBody.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let multihash
        if (typeof target === 'string') {
          // If target is a path, we need to calculate the hash
          multihash = await sha256.digest(bytes)
        }
        // If target is a multihash, we can use it directly
        else {
          multihash = target
        }
        yield { multihash, bytes }
        return
      }

      // Handle ranged reads
      for (const { multihash, offset, length } of ranges) {
        try {
          const r2ObjectBody = await bucket.get(target, {
            range: {
              offset,
              length: length ?? 0,
            },
          })
          if (!r2ObjectBody) continue

          const buffer = new Uint8Array(await r2ObjectBody.arrayBuffer())
          yield { multihash, bytes: buffer }
          /* c8 ignore next 4 */
        } catch (err) {
          // Handle error silently
          continue
        }
      }
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
    /**
     * Retrieves bytes of a pack file by its multihash digest and streams it in specified ranges.
     *
     * @param {import('@hash-stream/pack/types').MultihashDigest | import('@hash-stream/pack/types').Path} target - The Multihash digest of the pack or its path.
     * @param {Array<{ offset?: number, length?: number, multihash: import('@hash-stream/pack/types').MultihashDigest }>} [ranges]
     * @returns {AsyncIterable<import('@hash-stream/pack/types').VerifiableEntry>}
     */
    async *stream(target, ranges = []) {
      if (typeof target !== 'string') {
        throw new Error('only string paths are supported for S3LikeFileStore')
      }

      const filePath = path.join(tempDir, target)

      // Check if ranges are provided
      if (ranges.length === 0) {
        // If no ranges, stream the entire file
        try {
          const fileBuffer = await fs.promises.readFile(filePath)
          let multihash
          if (typeof target === 'string') {
            // If target is a path, we need to calculate the hash
            multihash = await sha256.digest(fileBuffer)
          }
          // If target is a multihash, we can use it directly
          else {
            multihash = target
          }
          yield { multihash, bytes: fileBuffer }
        } catch (/** @type {any} */ err) {
          /* c8 ignore next 4 */
          if (err.code !== 'ENOENT') {
            // If the file doesn't exist, return null, otherwise throw
            throw err
          }
        }
        return
      }
      // For each range, create a stream that reads the file chunk and buffers it
      for (const { multihash, offset, length } of ranges) {
        try {
          // @ts-expect-error we should be able to use the length property
          const buffer = await _bufferStream(filePath, offset, length)
          yield { multihash, bytes: buffer }
        } catch (/** @type {any} */ err) {
          /* c8 ignore next 4 */
          if (err.code !== 'ENOENT') {
            // If the file doesn't exist, return null, otherwise throw
            throw err
          }
        }
      }
    },
  })
  return Promise.resolve(fileStoreImplementation)
}

/**
 * Buffers the content of the file between the provided offset and length.
 *
 * @param {string} filePath - Path to the file.
 * @param {number} offset - Starting offset to read from.
 * @param {number} length - Length of the range to read.
 * @returns {Promise<Uint8Array>} - The buffered content of the range.
 */
async function _bufferStream(filePath, offset, length) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, {
      start: offset,
      end: offset + length - 1,
    })

    /** @type {Uint8Array[]} */
    const chunks = []
    let totalSize = 0

    stream.on('data', (chunk) => {
      // @ts-expect-error chunk is a Buffer
      const chunkArray = new Uint8Array(chunk) // Convert to Uint8Array
      chunks.push(chunkArray)
      totalSize += chunkArray.length
    })

    stream.on('end', () => {
      const result = new Uint8Array(totalSize)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      resolve(result)
    })

    stream.on('error', reject)
  })
}
