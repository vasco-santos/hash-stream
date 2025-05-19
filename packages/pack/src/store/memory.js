import * as API from '../api.js'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

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
   * @param {API.MultihashDigest | API.Path} target
   * @returns {string}
   */
  _getObjectKey(target) {
    if (typeof target === 'string') {
      return `${this.prefix}${target}${this.extension}`
    }
    return `${this.prefix}${MemoryPackStore.encodeKey(target)}${this.extension}`
  }

  /**
   * Put a pack file in memory.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @param {Uint8Array} data - The pack file bytes.
   */
  async put(target, data) {
    this.store.set(this._getObjectKey(target), data)
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(target) {
    return this.store.get(this._getObjectKey(target)) || null
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest and streams it in specified ranges.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  async *stream(target, ranges = []) {
    const key = this._getObjectKey(target)
    const bytes = this.store.get(key)
    /* c8 ignore next 1 */
    if (!bytes) return

    if (ranges.length === 0) {
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

    for (const { multihash, offset, length } of ranges) {
      /* c8 ignore next 1 */
      const slice = bytes.slice(offset, length ? offset + length : undefined)
      yield { multihash, bytes: slice }
    }
  }
}
