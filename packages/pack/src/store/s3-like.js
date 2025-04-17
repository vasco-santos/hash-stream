import * as API from '../api.js'
import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
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
   * @param {string} [config.extension] - Optional extension for stored objects, should include '.'.
   */
  constructor({ bucketName, client, prefix = '', extension = '.car' }) {
    this.bucketName = bucketName
    this.prefix = prefix
    this.client = client
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
    return `${this.prefix}${S3LikePackStore.encodeKey(hash)}${this.extension}`
  }

  /**
   * Put a pack file in S3.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Uint8Array} data - The pack file bytes.
   */
  async put(hash, data) {
    const objectKey = this._getObjectKey(hash)

    // If it is sha256, we can use the hash directly
    // Otherwise, we need to calculate the sha256 hash of the data
    // and use that as the checksum
    let checksum
    if (hash.code === sha256.code) {
      checksum = hash
    } else {
      checksum = await sha256.digest(data)
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: data,
        ChecksumSHA256: toBase64(checksum.digest),
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
            // Needed because range GET won't be the entire file
            // @ts-expect-error this mode is not typed
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
  }
}

/**
 * @param {Uint8Array} uint8Array
 */
function toBase64(uint8Array) {
  // Convert to a binary string, then use btoa
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  // eslint-disable-next-line no-undef
  return btoa(binary)
}
