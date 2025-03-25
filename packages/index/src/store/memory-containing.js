import * as API from '../api.js'

import { base58btc } from 'multiformats/bases/base58'
import { equals } from 'uint8arrays'

import {
  encode as indexRecordEncode,
  decode as indexRecordDecode,
} from '../record.js'

/**
 * In-memory implementation of ContainingIndexStore
 *
 * @implements {API.IndexStore}
 */
export class MemoryContainingIndexStore {
  constructor() {
    /** @type {Map<string, API.IndexRecordEntry[]>} */
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
   * @returns {Promise<AsyncIterable<API.IndexRecord> | null>}
   */
  async get(hash) {
    const key = MemoryContainingIndexStore.encodeKey(hash)
    const encodedData = this.store.get(key)
    if (!encodedData) return null

    const entries = encodedData
      .map((data) => this.decodeData(data))
      .reduce((acc, val) => {
        const entry = acc.find((entry) =>
          equals(entry.multihash.bytes, val.multihash.bytes)
        )

        // Update subrecords
        if (entry) {
          entry.subRecords.push(...val.subRecords)
        } else {
          acc.push(val)
        }
        return acc
      }, /** @type {API.IndexRecord[]} */ ([]))

    return (async function* () {
      for (const entry of entries) {
        yield entry
      }
    })()
  }

  /**
   * Add index entries.
   *
   * @param {AsyncIterable<API.IndexRecord>} entries
   * @returns {Promise<void>}
   */
  async add(entries) {
    for await (const entry of entries) {
      const key = MemoryContainingIndexStore.encodeKey(entry.multihash)

      let storedIndexEntries = this.store.get(key)
      if (!storedIndexEntries) {
        storedIndexEntries = [this.encodeData(entry)]
        this.store.set(key, storedIndexEntries)
      } else {
        storedIndexEntries.push(this.encodeData(entry))
      }
    }
  }
}

export const type = 'index/containing@0.1'
