import * as API from '../api.js'

import { base58btc } from 'multiformats/bases/base58'

import {
  encode as indexRecordEncode,
  decode as indexRecordDecode,
} from '../record.js'

/**
 * @typedef {import('multiformats').UnknownLink} UnknownLink
 */

/**
 * In-memory implementation of BlobIndexStore
 *
 * @implements {API.IndexStore}
 */
export class MemoryBlobIndexStore {
  constructor() {
    /** @type {Map<string, API.IndexRecordEntry>} */
    this.store = new Map()
  }

  /**
   * Generate a key for storage: b58(mh(CID))
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  static encodeKey(hash) {
    return base58btc.encode(hash.bytes)
  }

  /**
   * @param {API.IndexRecord} data
   */
  encodeData(data) {
    return {
      type,
      data: indexRecordEncode(data),
    }
  }

  /**
   * @param {API.IndexRecordEntry} encodeData
   */
  decodeData(encodeData) {
    return indexRecordDecode(encodeData.data)
  }

  /**
   * @param {API.MultihashDigest} hash
   * @returns {AsyncIterable<API.IndexRecord>}
   */
  async *get(hash) {
    const key = MemoryBlobIndexStore.encodeKey(hash)
    const encodedData = this.store.get(key)
    if (!encodedData) return null

    yield this.decodeData(encodedData)
  }

  /**
   * Add index entries.
   *
   * @param {AsyncIterable<API.IndexRecord>} entries
   * @returns {Promise<void>}
   */
  async add(entries) {
    for await (const entry of entries) {
      const key = MemoryBlobIndexStore.encodeKey(entry.multihash)
      this.store.set(key, this.encodeData(entry))
    }
  }
}

export const type = 'index/blob@0.1'
