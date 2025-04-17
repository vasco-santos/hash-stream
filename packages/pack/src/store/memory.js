import * as API from '../api.js'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'

/**
 * In-memory implementation of PackStore.
 *
 * @implements {API.PackStore}
 */
export class MemoryPackStore {
  /**
   * @param {object} config - Configuration for the memory store.
   * @param {string} [config.prefix] - Optional prefix for stored objects.
   * @param {string} [config.extension] - Optional extension for stored objects, should include '.'.
   */
  constructor({ prefix = '', extension = '.car' } = {}) {
    /** @type {Map<string, Uint8Array>} */
    this.store = new Map()
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
    return CID.createV1(RawCode, hash).toString()
  }

  /**
   * Generate a key for storage.
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  _getObjectKey(hash) {
    return `${this.prefix}${MemoryPackStore.encodeKey(hash)}${this.extension}`
  }

  /**
   * Put a pack file in memory.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Uint8Array} data - The pack file bytes.
   */
  async put(hash, data) {
    this.store.set(this._getObjectKey(hash), data)
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(hash) {
    return this.store.get(this._getObjectKey(hash)) || null
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest and streams it in specified ranges.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  async *stream(hash, ranges = []) {
    const key = this._getObjectKey(hash)
    const data = this.store.get(key)
    /* c8 ignore next 1 */
    if (!data) return

    if (ranges.length === 0) {
      yield { multihash: hash, bytes: data }
      return
    }

    for (const { multihash, offset, length } of ranges) {
      /* c8 ignore next 1 */
      const slice = data.slice(offset, length ? offset + length : undefined)
      yield { multihash, bytes: slice }
    }
  }
}
