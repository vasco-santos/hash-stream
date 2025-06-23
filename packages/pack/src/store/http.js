/* global fetch */
import * as API from '../api.js'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 * In-memory implementation of PackStore.
 *
 * @implements {API.PackStoreReader}
 */
export class HTTPPackStore {
  /**
   * @param {object} config - Configuration for the http store.
   * @param {URL} config.url - Pack Store URL
   * @param {string} [config.prefix] - Optional prefix for stored objects.
   * @param {string} [config.extension] - Optional extension for stored objects, should include '.'.
   */
  constructor({ url, prefix = '', extension = '.car' }) {
    this.url = url
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
    return `${this.prefix}${HTTPPackStore.encodeKey(target)}${this.extension}`
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(target) {
    const key = this._getObjectKey(target)
    const response = await fetch(new URL(key, this.url))

    if (!response.ok) {
      return null
    }

    const data = await response.arrayBuffer()
    return new Uint8Array(data)
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
    const fileURL = new URL(key, this.url)

    // If no ranges, fetch the whole file
    if (ranges.length === 0) {
      const res = await fetch(fileURL)
      if (!res.ok) return

      const buffer = new Uint8Array(await res.arrayBuffer())

      let multihash
      if (typeof target === 'string') {
        multihash = await sha256.digest(buffer)
      } else {
        multihash = target
      }

      yield { multihash, bytes: buffer }
      return
    }

    // Stream by specified ranges
    for (const { multihash, offset, length } of ranges) {
      /* c8 ignore next 1 */
      const end = length ? offset + length - 1 : ''
      const rangeHeader = `bytes=${offset}-${end}`

      const res = await fetch(fileURL, {
        headers: {
          Range: rangeHeader,
        },
      })

      if (res.status === 206 || res.status === 200) {
        const bytes = new Uint8Array(await res.arrayBuffer())
        yield { multihash, bytes }
      } else if (res.status === 416 || res.status === 404) {
        continue // Range Not Satisfiable or Not Found – skip
        /* c8 ignore next 3 */
      } else {
        throw new Error(`Unexpected response: ${res.status} ${res.statusText}`)
      }
    }
  }
}
