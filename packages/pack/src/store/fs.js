import * as API from '../api.js'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

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
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @returns {string}
   */
  _getFilePath(target) {
    if (typeof target === 'string') {
      return `${this.directory}/${this.prefix}${target}${this.extension}`
    }
    return path.join(
      this.directory,
      `${this.prefix}${FSPackStore.encodeKey(target)}${this.extension}`
    )
  }

  /**
   * Put a pack file.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @param {Uint8Array} data - The pack file bytes.
   */
  async put(target, data) {
    const filePath = this._getFilePath(target)
    const dirPath = path.dirname(filePath) // Get the directory path from the full file path

    // Check if the directory exists, and if not, create it recursively
    await fs.mkdir(dirPath, { recursive: true })

    await fs.writeFile(filePath, data)
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(target) {
    const filePath = this._getFilePath(target)
    try {
      return await fs.readFile(filePath)
    } catch {
      return null
    }
  }

  /**
   * Retrieves bytes of a pack file by its multihash digest and streams it in specified ranges.
   *
   * @param {API.MultihashDigest | API.Path} target - The Multihash digest of the pack or its path.
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  async *stream(target, ranges = []) {
    const filePath = this._getFilePath(target)

    // Check if ranges are provided
    if (ranges.length === 0) {
      // If no ranges, stream the entire file
      try {
        const fileBuffer = await fs.readFile(filePath)
        let multihash
        /* c8 ignore next 4 */
        if (typeof target === 'string') {
          // If target is a path, we need to calculate the hash
          multihash = await sha256.digest(fileBuffer)
        }
        // If target is a multihash, we can use it directly
        else {
          multihash = target
        }
        yield { multihash, bytes: fileBuffer }
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
