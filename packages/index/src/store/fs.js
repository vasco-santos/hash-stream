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
import { removeUndefinedRecursively } from './utils.js'

/**
 * File System implementation of IndexStore
 *
 * @implements {API.IndexStore}
 */
export class FSIndexStore {
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
  #getFolderPath(hash) {
    return path.join(this.directory, FSIndexStore.encodeKey(hash))
  }

  /**
   * Generate a file path inside a folder with a unique timestamp-based name
   *
   * @param {API.MultihashDigest} hash
   * @param {API.MultihashDigest} [subRecordMultihash]
   * @returns {string}
   */
  #getFilePath(hash, subRecordMultihash) {
    const folderPath = this.#getFolderPath(hash)
    const uniqueId = subRecordMultihash
      ? `${FSIndexStore.encodeKey(subRecordMultihash)}`
      : Date.now().toString()
    return path.join(folderPath, uniqueId)
  }

  /**
   * @param {API.IndexRecord} data
   * @param {string} recordType
   */
  encodeData(data, recordType) {
    /** @type {{ type: string; data: API.IndexRecordEncoded }} */
    const encodableEntry = {
      type: recordType,
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
   * @returns {AsyncIterable<API.IndexRecord>}
   */
  async *get(hash) {
    const folderPath = this.#getFolderPath(hash)
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
        if (err.code === 'ENOENT') continue // No data stored
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

    for (const entry of mergedRecords) {
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
      let subRecordMultihash
      if (entry.subRecords.length > 0) {
        subRecordMultihash = entry.subRecords[0].multihash
      }
      const filePath = this.#getFilePath(entry.multihash, subRecordMultihash)
      const encodedData = this.encodeData(entry, recordType)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, encodedData)
    }
  }
}
