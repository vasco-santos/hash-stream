import * as API from '../api.js'
import { encode, decode } from '@ipld/dag-json'
import { base58btc } from 'multiformats/bases/base58'
import { equals } from 'uint8arrays'
import {
  encode as indexRecordEncode,
  decode as indexRecordDecode,
} from '../record.js'
import { removeUndefinedRecursively } from './utils.js'

/**
 * Cloudflare Worker Bucket R2 implementation of IndexStore
 *
 * @implements {API.IndexStore}
 */
export class CloudflareWorkerBucketIndexStore {
  /**
   * @param {object} config - Configuration for the R2 client.
   * @param {import('@cloudflare/workers-types').R2Bucket} config.bucket - R2 bucket instance of a worker.
   */
  constructor({ bucket }) {
    this.bucket = bucket
  }

  /**
   * Generate a key for storage: b58(mh(CID))
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  static encodeKey(hash) {
    const encodedMultihash = base58btc.encode(hash.bytes)
    // Cloud storages typically rate limit at the path level, this allows more requests
    return `${encodedMultihash}/${encodedMultihash}`
  }

  /**
   * Generate a folder path for a given hash key
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  #getFolderPath(hash) {
    return `${CloudflareWorkerBucketIndexStore.encodeKey(hash)}/`
  }

  /**
   * Generate a file path inside a folder with a unique timestamp-based name
   *
   * @param {API.MultihashDigest} hash
   * @param {API.MultihashDigest} [subRecordMultihash]
   * @returns {string}
   */
  #getFilePath(hash, subRecordMultihash) {
    const folderPath = this.#getFolderPath(hash)
    const uniqueId = subRecordMultihash
      ? `${CloudflareWorkerBucketIndexStore.encodeKey(subRecordMultihash)}`
      : Date.now().toString()
    return `${folderPath}${uniqueId}`
  }

  /**
   * @param {API.IndexRecord} data
   * @param {string} recordType
   */
  encodeData(data, recordType) {
    /** @type {{ type: string; data: API.IndexRecordEncoded }} */
    const encodableEntry = {
      type: recordType,
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
    const folderPath = this.#getFolderPath(hash)
    const listedObjects = await this.bucket.list({
      prefix: folderPath,
    })

    /* c8 ignore next 1 */
    if (!listedObjects.objects) return null

    const records = []
    for (const object of listedObjects.objects) {
      const r2ObjectBody = await this.bucket.get(object.key)
      /* c8 ignore next 1 */
      if (!r2ObjectBody) continue
      const encodedData = await r2ObjectBody.arrayBuffer()
      const record = this.decodeData(new Uint8Array(encodedData))
      records.push(record)
    }

    const mergedRecords = records.reduce((acc, val) => {
      const entry = acc.find((entry) =>
        equals(entry.multihash.bytes, val.multihash.bytes)
      )
      if (entry) {
        entry.subRecords.push(...val.subRecords)
      } else {
        acc.push(val)
      }
      return acc
    }, /** @type {API.IndexRecord[]} */ ([]))

    for (const entry of mergedRecords) {
      yield entry
    }
  }

  /**
   * Add index entries.
   *
   * @param {AsyncIterable<API.IndexRecord>} entries
   * @param {string} recordType
   * @returns {Promise<void>}
   */
  async add(entries, recordType) {
    for await (const entry of entries) {
      let subRecordMultihash
      if (entry.subRecords.length > 0) {
        subRecordMultihash = entry.subRecords[0].multihash
      }
      const filePath = this.#getFilePath(entry.multihash, subRecordMultihash)
      const encodedData = this.encodeData(entry, recordType)
      await this.bucket.put(filePath, new Uint8Array(encodedData))
    }
  }
}
