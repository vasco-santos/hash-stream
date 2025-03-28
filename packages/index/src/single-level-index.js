import * as API from './api.js'

import { base58btc } from 'multiformats/bases/base58'

import { createFromBlob, createFromPack } from './record.js'

/**
 * @typedef {import('@ipld/car/indexer').BlockIndex} BlockIndex
 */

/**
 * SingleLevelIndex implements the Index interface
 * and provides methods to locate blobs and packs.
 *
 * @implements {API.Index}
 */
export class SingleLevelIndex {
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

  /**
   * Find the index records of a given multihash.
   *
   * @param {API.MultihashDigest} multihash
   * @returns {AsyncIterable<API.IndexRecord>}
   */
  async *findRecords(multihash) {
    for await (const entry of this.store.get(multihash)) {
      yield entry
    }
  }
}
