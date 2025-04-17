import * as API from '../api.js'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { equals } from 'uint8arrays'

import {
  encode as indexRecordEncode,
  decode as indexRecordDecode,
} from '../record.js'

/**
 * In-memory implementation of IndexStore
 *
 * @implements {API.IndexStore}
 */
export class MemoryIndexStore {
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
    return CID.createV1(RawCode, hash).toString()
  }

  /**
   * @param {API.IndexRecord} data
   * @param {string} recordType
   */
  encodeData(data, recordType) {
    return {
      type: recordType,
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
    const key = MemoryIndexStore.encodeKey(hash)
    const encodedData = this.store.get(key)
    if (!encodedData) return null

    const entries = encodedData
      .map((data) => this.decodeData(data))
      .reduce((acc, val) => {
        const entry = acc.find(
          (entry) =>
            equals(entry.multihash.bytes, val.multihash.bytes) &&
            entry.type === val.type
        )

        // Update subrecords
        if (entry) {
          entry.subRecords.push(...val.subRecords)
        } else {
          acc.push(val)
        }
        return acc
      }, /** @type {API.IndexRecord[]} */ ([]))

    for (const entry of entries) {
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
      const key = MemoryIndexStore.encodeKey(entry.multihash)

      let storedIndexEntries = this.store.get(key)
      if (!storedIndexEntries) {
        storedIndexEntries = [this.encodeData(entry, recordType)]
        this.store.set(key, storedIndexEntries)
      } else {
        storedIndexEntries.push(this.encodeData(entry, recordType))
      }
    }
  }
}
