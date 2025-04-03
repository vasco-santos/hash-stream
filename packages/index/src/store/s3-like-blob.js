import * as API from '../api.js'

import { encode, decode } from '@ipld/dag-json'
import { base58btc } from 'multiformats/bases/base58'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

import {
  encode as indexRecordEncode,
  decode as indexRecordDecode,
} from '../record.js'
import { removeUndefinedRecursively } from './utils.js'

/**
 * S3-compatible implementation of BlobIndexStore
 *
 * @implements {API.IndexStore}
 */
export class S3LikeBlobIndexStore {
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
   * @param {API.IndexRecord} data
   * @returns {Uint8Array}
   */
  encodeData(data) {
    /** @type {{ type: 'index/blob@0.1'; data: API.IndexRecordEncoded }} */
    const encodableEntry = {
      type,
      data: removeUndefinedRecursively(indexRecordEncode(data)),
    }
    return encode(encodableEntry)
  }

  /**
   * @param {Uint8Array} data
   * @returns {API.IndexRecord}
   */
  decodeData(data) {
    const decodedData = decode(data)
    return indexRecordDecode(decodedData.data)
  }

  /**
   * @param {API.MultihashDigest} hash
   * @returns {AsyncIterable<API.IndexRecord>}
   */
  async *get(hash) {
    const key = S3LikeBlobIndexStore.encodeKey(hash)
    try {
      const { Body } = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucketName, Key: key })
      )
      /* c8 ignore next 1 */
      if (!Body) return null
      const data = await Body.transformToByteArray()
      yield this.decodeData(data)
    } catch (/** @type {any} */ err) {
      /* c8 ignore next 3 */
      if (err.name === 'NoSuchKey') return null
      throw err
    }
  }

  /**
   * Add index entries.
   *
   * @param {AsyncIterable<API.IndexRecord>} entries
   * @returns {Promise<void>}
   */
  async add(entries) {
    for await (const entry of entries) {
      const key = S3LikeBlobIndexStore.encodeKey(entry.multihash)
      const encodedData = this.encodeData(entry)
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: encodedData,
        })
      )
    }
  }
}

export default S3LikeBlobIndexStore

export const type = 'index/blob@0.1'
