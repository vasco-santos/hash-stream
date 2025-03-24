import * as API from '../api.js'

import fs from 'fs/promises'
import path from 'path'
import { encode, decode } from '@ipld/dag-json'
import { base58btc } from 'multiformats/bases/base58'

import {
  encode as indexRecordEncode,
  decode as indexRecordDecode,
} from '../record.js'

/**
 * File system implementation of BlobIndexStore
 *
 * @implements {API.IndexStore}
 */
export class FSBlobStore {
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
   * Generate a path for storage: b58(mh(CID))
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  _getFilePath(hash) {
    return path.join(this.directory, FSBlobStore.encodeKey(hash))
  }

  /**
   * @param {API.IndexRecord} data
   */
  encodeData(data) {
    /** @type {{ type: 'index/blob@0.1'; data: API.IndexRecordEncoded }} */
    const encodableEntry = {
      type,
      data: indexRecordEncode(data),
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
    const filePath = this._getFilePath(hash)
    let encodedData
    try {
      encodedData = await fs.readFile(filePath)
    } catch (/** @type {any} */ err) {
      if (err.code === 'ENOENT') return null
      /* c8 ignore next 2 */
      throw err
    }

    const data = this.decodeData(encodedData)

    return (async function* () {
      yield data
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
      const filePath = this._getFilePath(entry.multihash)
      const encodedData = this.encodeData(entry)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, encodedData)
    }
  }
}

export default FSBlobStore

export const type = 'index/blob@0.1'
