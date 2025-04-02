import * as API from './api.js'

import { equals } from 'uint8arrays'

/**
 * MultipleLevelIndex implements the Index Reader interface
 * and provides find records to locate blobs, packs nad contains.
 *
 * @implements {API.IndexReader}
 */
export class IndexReader {
  /**
   * @param {API.IndexStore} store - The store where the index is maintained.
   */
  constructor(store) {
    this.store = store
  }

  /**
   * Find the index records of a given multihash.
   *
   * @param {API.MultihashDigest} multihash
   * @param {object} [options]
   * @param {API.MultihashDigest} [options.containingMultihash]
   * @returns {AsyncIterable<API.IndexRecord>}
   */
  async *findRecords(multihash, { containingMultihash } = {}) {
    let found = false
    if (containingMultihash) {
      for await (const entry of this.store.get(containingMultihash)) {
        for await (const subRecord of findInSubRecords(
          entry.subRecords,
          multihash
        )) {
          found = true
          yield subRecord
        }
      }
    }
    // No need to try directly if we already found the multihash
    if (found) {
      return
    }
    // If there is no containing multihash, search for the multihash directly
    for await (const entry of this.store.get(multihash)) {
      yield entry
    }
  }
}

/**
 * @param {API.IndexRecord[]} subRecords
 * @param {API.MultihashDigest} multihash
 * @returns {AsyncIterable<API.IndexRecord>}
 */
async function* findInSubRecords(subRecords, multihash) {
  for (const subRecord of subRecords) {
    if (equals(subRecord.multihash.bytes, multihash.bytes)) {
      yield subRecord
      /* c8 ignore next 1 */
    }
    if (subRecord.subRecords.length) {
      yield* findInSubRecords(subRecord.subRecords, multihash)
    }
  }
}
