import * as API from '../api.js'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'

import { promises as fs, createReadStream } from 'fs'
import path from 'path'

/**
 * File system implementation of PackStore
 *
 * @implements {API.PackStore}
 */
export class FSPackStore {
  /**
   * @param {string} directory - Directory to store packs files.
   * @param {object} config - Configuration for the memory store.
   * @param {string} [config.prefix] - Optional prefix for stored objects.
   * @param {string} [config.extension] - Optional extension for stored objects, should include '.'.
   */
  constructor(directory, { prefix = '', extension = '.car' } = {}) {
    this.directory = directory
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
   * Generate a path for storage: b58(mh(CID))
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  _getFilePath(hash) {
    return path.join(
      this.directory,
      `${this.prefix}${FSPackStore.encodeKey(hash)}${this.extension}`
    )
  }

  /**
   * Put a pack file.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Uint8Array} data - The pack file bytes.
   */
  async put(hash, data) {
    const filePath = this._getFilePath(hash)
    await fs.writeFile(filePath, data)
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(hash) {
    const filePath = this._getFilePath(hash)
    try {
      return await fs.readFile(filePath)
    } catch {
      return null
    }
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest and streams it in specified ranges.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the pack.
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  async *stream(hash, ranges = []) {
    const filePath = this._getFilePath(hash)

    // Check if ranges are provided
    if (ranges.length === 0) {
      // If no ranges, stream the entire file
      try {
        const fileBuffer = await fs.readFile(filePath)
        yield { multihash: hash, bytes: fileBuffer }
      } catch (/** @type {any} */ err) {
        /* c8 ignore next 4 */
        if (err.code !== 'ENOENT') {
          // If the file doesn't exist, return null, otherwise throw
          throw err
        }
      }
      return
    }
    // For each range, create a stream that reads the file chunk and buffers it
    for (const { multihash, offset, length } of ranges) {
      try {
        // @ts-expect-error we should be able to use the length property
        const buffer = await this._bufferStream(filePath, offset, length)
        yield { multihash, bytes: buffer }
      } catch (/** @type {any} */ err) {
        /* c8 ignore next 4 */
        if (err.code !== 'ENOENT') {
          // If the file doesn't exist, return null, otherwise throw
          throw err
        }
      }
    }
  }

  /**
   * Buffers the content of the file between the provided offset and length.
   *
   * @param {string} filePath - Path to the file.
   * @param {number} offset - Starting offset to read from.
   * @param {number} length - Length of the range to read.
   * @returns {Promise<Uint8Array>} - The buffered content of the range.
   */
  async _bufferStream(filePath, offset, length) {
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, {
        start: offset,
        end: offset + length - 1,
      })

      /** @type {Uint8Array[]} */
      const chunks = []
      let totalSize = 0

      stream.on('data', (chunk) => {
        // @ts-expect-error chunk is a Buffer
        const chunkArray = new Uint8Array(chunk) // Convert to Uint8Array
        chunks.push(chunkArray)
        totalSize += chunkArray.length
      })

      stream.on('end', () => {
        const result = new Uint8Array(totalSize)
        let offset = 0
        for (const chunk of chunks) {
          result.set(chunk, offset)
          offset += chunk.length
        }
        resolve(result)
      })

      stream.on('error', reject)
    })
  }
}
