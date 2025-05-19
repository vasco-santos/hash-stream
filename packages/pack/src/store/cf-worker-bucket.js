import * as API from '../api.js'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 * Cloudflare Worker Bucket R2 implementation of PackStore
 *
 * @implements {API.PackStore}
 */
export class CloudflareWorkerBucketPackStore {
  /**
   * @param {object} config - Configuration for the R2 client.
   * @param {import('@cloudflare/workers-types').R2Bucket} config.bucket - R2 bucket instance of a worker.
   * @param {string} [config.prefix] - Optional prefix for stored objects.
   * @param {string} [config.extension] - Optional extension for stored objects, should include '.'.
   */
  constructor({ bucket, prefix = '', extension = '.car' }) {
    this.bucket = bucket
    this.prefix = prefix
    this.extension = extension
  }

  /**
   * Generate a key for storage: b58(mh(CID))
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  static encodeKey(hash) {
    const encodedMultihash = CID.createV1(RawCode, hash).toString()
    // Cloud storages typically rate limit at the path level, this allows more requests
    return `${encodedMultihash}/${encodedMultihash}`
  }

  /**
   * Generate an S3 object key for storage.
   *
   * @param {API.MultihashDigest | API.Path} target
   * @returns {string}
   */
  _getObjectKey(target) {
    if (typeof target === 'string') {
      return `${this.prefix}${target}${this.extension}`
    }
    return `${this.prefix}${CloudflareWorkerBucketPackStore.encodeKey(target)}${
      this.extension
    }`
  }

  /**
   * Put a pack file in R2.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @param {Uint8Array} data - The pack file bytes.
   */
  async put(target, data) {
    const objectKey = this._getObjectKey(target)
    // If it is sha256, we can use the hash directly
    // Otherwise, we need to calculate the sha256 hash of the data
    // and use that as the checksum
    let checksum
    if (typeof target !== 'string' && target.code === sha256.code) {
      checksum = target
    } else {
      checksum = await sha256.digest(data)
    }
    // Store the pack file in R2
    await this.bucket.put(objectKey, data, {
      sha256: toHex(checksum.digest),
    })
  }

  /**
   * Retrieves bytes of a pack file from R2 by its multihash digest or path.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(target) {
    const objectKey = this._getObjectKey(target)
    const r2ObjectBody = await this.bucket.get(objectKey)
    if (!r2ObjectBody) return null
    const buffer = await r2ObjectBody.arrayBuffer()
    return new Uint8Array(buffer)
  }

  /**
   * Retrieves bytes of a pack file from R2 by its multihash digest or path and streams it in specified ranges.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  async *stream(target, ranges = []) {
    const objectKey = this._getObjectKey(target)

    // If no ranges, stream the entire file
    if (ranges.length === 0) {
      const r2ObjectBody = await this.bucket.get(objectKey)
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
        const r2ObjectBody = await this.bucket.get(objectKey, {
          range: {
            offset,
            length,
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
  }
}

/**
 * @param {Uint8Array} uint8Array
 */
function toHex(uint8Array) {
  return [...uint8Array].map((b) => b.toString(16).padStart(2, '0')).join('')
}
