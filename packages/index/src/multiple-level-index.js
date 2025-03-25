import * as API from './api.js'

import { equals } from 'uint8arrays'
import { base58btc } from 'multiformats/bases/base58'

import {
  createFromBlob,
  createFromPack,
  createFromContaining,
} from './record.js'

/**
 * MultipleLevelIndex implements the Index interface
 * and provides find records to locate blobs, packs nad containigns.
 *
 * @implements {API.Index}
 */
export class MultipleLevelIndex {
  /**
   * @param {API.IndexStore} store - The store where the index is maintained.
   */
  constructor(store) {
    this.store = store
  }

  /**
   * Indexes a given pack of blocks and optionally associates them with a containing multihash.
   *
   * @param {AsyncIterable<API.BlobIndexRecord>} blobIndexIterable
   * @param {object} [options]
   * @param {API.MultihashDigest} [options.containingMultihash]
   * @returns {Promise<void>}
   */
  async addBlobs(blobIndexIterable, { containingMultihash } = {}) {
    /** @type {Map<string, API.IndexRecord>} */
    const subRecords = new Map()

    // Collect all blobs
    for await (const {
      multihash,
      location,
      offset,
      length,
    } of blobIndexIterable) {
      // Create Blob Index record
      const blob = createFromBlob(multihash, location, offset, length)

      // Block packed in a location
      if (!equals(multihash.bytes, location.bytes)) {
        const encodedLocation = base58btc.encode(location.bytes)
        let packIndexRecord = subRecords.get(encodedLocation)
        if (!packIndexRecord) {
          packIndexRecord = createFromPack(location, [blob])
          subRecords.set(encodedLocation, packIndexRecord)
        } else {
          packIndexRecord.subRecords.push(blob)
        }
      }
      // Blob is located inline
      else {
        const encodedLocation = base58btc.encode(location.bytes)
        subRecords.set(encodedLocation, blob)
      }
    }

    // Create final IndexRecord with containing multihash
    if (containingMultihash) {
      const containing = createFromContaining(containingMultihash, [
        ...subRecords.values(),
      ])
      await this.store.add(
        (async function* () {
          yield containing
        })()
      )
    }
    // If there is no containing multihash, add all subRecords individually
    else {
      await this.store.add(
        (async function* () {
          for (const record of subRecords.values()) {
            yield record
          }
        })()
      )
    }
  }

  /**
   * Find the index records of a given multihash.
   *
   * @param {API.MultihashDigest} multihash
   * @param {object} [options]
   * @param {API.MultihashDigest} [options.containingMultihash]
   * @returns {Promise<AsyncIterable<API.IndexRecord> | null>}
   */
  async findRecords(multihash, { containingMultihash } = {}) {
    if (containingMultihash) {
      const entries = await this.store.get(containingMultihash)
      if (entries === null) {
        return null
      }

      for await (const entry of entries) {
        for await (const subRecord of findInSubRecords(
          entry.subRecords,
          multihash
        )) {
          return (async function* () {
            yield subRecord
          })()
        }
      }
    }

    return this.store.get(multihash)
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
      // /* c8 ignore next 1 */
    }
    if (subRecord.subRecords) {
      yield* findInSubRecords(subRecord.subRecords, multihash)
    }
  }
}
