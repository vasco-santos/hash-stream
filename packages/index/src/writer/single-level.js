import * as API from '../api.js'

import { base58btc } from 'multiformats/bases/base58'

import { createFromBlob, createFromPack } from '../record.js'

/**
 * @typedef {import('@ipld/car/indexer').BlockIndex} BlockIndex
 */

/**
 * SingleLevelIndexWriter implements the Index Writer interface
 * and provides methods to write blobs and packs.
 *
 * @implements {API.IndexWriter}
 */
export class SingleLevelIndexWriter {
  /**
   * @param {API.IndexStore} store - The store where the index is maintained.
   */
  constructor(store) {
    this.store = store
  }

  /**
   * Indexes a given pack of blocks.
   *
   * @param {AsyncIterable<API.BlobIndexRecord>} blobIndexIterable
   * @returns {Promise<void>}
   */
  async addBlobs(blobIndexIterable) {
    // Pass an async iterable transformer directly to store.add()
    await this.store.add(this.#transformToIndexRecords(blobIndexIterable))
  }

  /**
   * Transforms blobIndexIterable into an async iterable of IndexRecord.
   *
   * @param {AsyncIterable<API.BlobIndexRecord>} blobIndexIterable - The block indexes to process
   * @returns {AsyncIterable<API.IndexRecord>}
   */
  async *#transformToIndexRecords(blobIndexIterable) {
    /** @type {Map<string, API.MultihashDigest>} */
    const packs = new Map()

    for await (const {
      multihash,
      location,
      offset,
      length,
    } of blobIndexIterable) {
      // Create Blob Index record and yield it
      const blob = createFromBlob(multihash, location, offset, length)
      yield blob

      // Create/Update Pack Index record
      const encodedLocation = base58btc.encode(location.bytes)
      packs.set(encodedLocation, location)
    }

    // Yield Pack Index records as Blobs
    for (const multihash of packs.values()) {
      yield createFromPack(multihash, [])
    }
  }
}
