import * as API from '../api.js'

import fs from 'fs/promises'
import path from 'path'
import { encode, decode } from '@ipld/dag-json'
import { base58btc } from 'multiformats/bases/base58'
import { equals } from 'uint8arrays'

import {
  encode as indexRecordEncode,
  decode as indexRecordDecode,
} from '../record.js'

/**
 * File System implementation of ContainingIndexStore
 *
 * @implements {API.IndexStore}
 */
export class FSContainingIndexStore {
  /**
   * @param {string} directory
   */
  constructor(directory) {
    this.directory = directory
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
   * Generate a folder path for a given hash key
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  _getFolderPath(hash) {
    return path.join(this.directory, FSContainingIndexStore.encodeKey(hash))
  }

  /**
   * Generate a file path inside a folder with a unique timestamp-based name
   *
   * @param {API.MultihashDigest} hash
   * @param {API.MultihashDigest} [subRecordMultihash]
   * @returns {string}
   */
  _getFilePath(hash, subRecordMultihash) {
    const folderPath = this._getFolderPath(hash)
    const uniqueId = subRecordMultihash
      ? `${FSContainingIndexStore.encodeKey(subRecordMultihash)}`
      : Date.now().toString()
    return path.join(folderPath, uniqueId)
  }

  /**
   * @param {API.IndexRecord} data
   */
  encodeData(data) {
    /** @type {{ type: 'index/containing@0.1'; data: API.IndexRecordEncoded }} */
    const encodableEntry = {
      type,
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
   * @returns {Promise<AsyncIterable<API.IndexRecord> | null>}
   */
  async get(hash) {
    const folderPath = this._getFolderPath(hash)
    let files
    try {
      files = await fs.readdir(folderPath)
    } catch (/** @type {any} */ err) {
      /* c8 ignore next 3 */
      if (err.code === 'ENOENT') return null // No data stored
      throw err
    }

    const records = []
    for (const file of files) {
      try {
        const encodedData = await fs.readFile(path.join(folderPath, file))
        const record = this.decodeData(encodedData)
        records.push(record)
        /* c8 ignore next 4 */
      } catch (/** @type {any} */ err) {
        if (err.code === 'ENOENT') return null // No data stored
        throw err
      }
    }

    // Merge subRecords similar to the in-memory implementation
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

    return (async function* () {
      for (const entry of mergedRecords) {
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
      let subRecordMultihash
      if (entry.subRecords.length > 0) {
        subRecordMultihash = entry.subRecords[0].multihash
      }
      const filePath = this._getFilePath(entry.multihash, subRecordMultihash)
      const encodedData = this.encodeData(entry)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, encodedData)
    }
  }
}

export const type = 'index/containing@0.1'

/**
 * @param {any} input
 * @returns {any}
 */
function removeUndefinedRecursively(input) {
  if (Array.isArray(input)) {
    // Process arrays recursively but do NOT touch non-undefined values like Uint8Array
    return input.map(removeUndefinedRecursively).filter((v) => v !== undefined)
  }

  if (
    input &&
    typeof input === 'object' &&
    Object.getPrototypeOf(input) === Object.prototype
  ) {
    // Only process plain objects, ignoring things like Uint8Array
    return Object.fromEntries(
      Object.entries(input)
        .map(([key, value]) => [key, removeUndefinedRecursively(value)])
        .filter(([_, value]) => value !== undefined)
    )
  }

  // Return all other types as they are
  return input
}
