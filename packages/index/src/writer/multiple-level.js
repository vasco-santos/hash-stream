import * as API from '../api.js'

import { equals } from 'uint8arrays'
import { base58btc } from 'multiformats/bases/base58'

import {
  createFromBlob,
  createFromPack,
  createFromContaining,
} from '../record.js'

/**
 * MultipleLevelIndex implements the Index Writer interface
 * and provides methods to write blobs and packs.
 *
 * @implements {API.IndexWriter}
 */
export class MultipleLevelIndexWriter {
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

      // Block is in a Path location, so we can add the blob directly
      if (typeof location === 'string') {
        // Make location unique to avoid collisions of multiple blobs in the same path
        const encodedLocation = `${location}/${base58btc.encode(
          blob.multihash.bytes
        )}`
        subRecords.set(encodedLocation, blob)
        // Block packed in a location
      } else if (!equals(multihash.bytes, location.bytes)) {
        const encodedLocation = base58btc.encode(location.bytes)
        let packIndexRecord = subRecords.get(encodedLocation)
        if (!packIndexRecord) {
          packIndexRecord = createFromPack(location, location, [blob])
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
        })(),
        recordType
      )
    }
    // If there is no containing multihash, add all subRecords individually as a record
    else {
      await this.store.add(
        (async function* () {
          for (const record of subRecords.values()) {
            yield record
          }
        })(),
        recordType
      )
    }
  }
}

export const recordType = 'index/containing@0.1'
