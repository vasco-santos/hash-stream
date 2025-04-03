import * as API from '../api.js'
import { base58btc } from 'multiformats/bases/base58'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

/**
 * S3-like implementation of PackStore
 *
 * @implements {API.PackStore}
 */
export class S3LikePackStore {
  /**
   * @param {object} config - Configuration for the S3 client.
   * @param {string} config.bucketName - S3 bucket name.
   * @param {S3Client} config.client - S3 client instance.
   * @param {string} [config.prefix] - Optional prefix for stored objects.
   */
  constructor({ bucketName, client, prefix = '' }) {
    this.bucketName = bucketName
    this.prefix = prefix
    this.client = client
  }

  /**
   * Generate a key for storage: b58(mh(CID))
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  static encodeKey(hash) {
    const encodedMultihash = base58btc.encode(hash.bytes)
    // Cloud storages typically rate llimit at the path level, this allows more requests
    return `${encodedMultihash}/${encodedMultihash}`
  }

  /**
   * Generate an S3 object key for storage.
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  _getObjectKey(hash) {
    return `${this.prefix}${S3LikePackStore.encodeKey(hash)}`
  }

  /**
   * Put a pack file in S3.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Uint8Array} data - The pack file bytes.
   */
  async put(hash, data) {
    const objectKey = this._getObjectKey(hash)
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: data,
      })
    )
  }

  /**
   * Retrieves bytes of a pack file from S3 by its multihash digest.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(hash) {
    const objectKey = this._getObjectKey(hash)
    try {
      const { Body } = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
        })
      )
      /* c8 ignore next 1 */
      if (!Body) return null
      return new Uint8Array(await Body.transformToByteArray())
    } catch (/** @type {any} */ err) {
      /* c8 ignore next 3 */
      if (err.name === 'NoSuchKey') return null
      throw err
    }
  }

  /**
   * Retrieves bytes of a pack file from S3 by its multihash digest and streams it in specified ranges.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  async *stream(hash, ranges = []) {
    const objectKey = this._getObjectKey(hash)

    // If no ranges, stream the entire file
    if (ranges.length === 0) {
      try {
        const { Body } = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: objectKey,
          })
        )
        /* c8 ignore next 1 */
        if (!Body) return

        const buffer = new Uint8Array(await Body.transformToByteArray())
        yield { multihash: hash, bytes: buffer }
      } catch (/** @type {any} */ err) {
        /* c8 ignore next 1 */
        if (err.name !== 'NoSuchKey') throw err
      }
      return
    }

    // Handle ranged reads
    for (const { multihash, offset, length } of ranges) {
      try {
        /* c8 ignore next 11 */
        const rangeHeader = `bytes=${offset}-${
          length ? offset + length - 1 : ''
        }`
        const { Body } = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: objectKey,
            Range: rangeHeader,
          })
        )
        if (!Body) continue

        const buffer = new Uint8Array(await Body.transformToByteArray())
        yield { multihash, bytes: buffer }
      } catch (/** @type {any} */ err) {
        /* c8 ignore next 1 */
        if (err.name !== 'NoSuchKey') throw err
      }
    }
  }
}
