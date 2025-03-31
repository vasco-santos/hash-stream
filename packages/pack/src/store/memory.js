import * as API from '../api.js'
import { base58btc } from 'multiformats/bases/base58'

/**
 * In-memory implementation of PackStore.
 *
 * @implements {API.PackStore}
 */
export class MemoryPackStore {
  constructor() {
    /** @type {Map<string, Uint8Array>} */
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
   * Put a pack file in memory.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Uint8Array} data - The pack file bytes.
   */
  async put(hash, data) {
    this.store.set(MemoryPackStore.encodeKey(hash), data)
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(hash) {
    return this.store.get(MemoryPackStore.encodeKey(hash)) || null
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest and streams it in specified ranges.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  async *stream(hash, ranges = []) {
    const key = MemoryPackStore.encodeKey(hash)
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
