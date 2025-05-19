import * as API from './api.js'

import { base58btc } from 'multiformats/bases/base58'
import { decode as decodeDigest } from 'multiformats/hashes/digest'
import { Type as IndexRecordType } from '@hash-stream/index/record'

/**
 * HashStreamer is responsible for streamming verifiable Blobs that composed a requested Multihash.
 *
 * @implements {API.HashStreamer}
 */
export class HashStreamer {
  /**
   * @param {API.IndexReader} indexReader
   * @param {API.PackReader} packReader
   */
  constructor(indexReader, packReader) {
    this.indexReader = indexReader
    this.packReader = packReader
  }

  /**
   *
   * @param {API.MultihashDigest} targetMultihash
   * @param {object} [options]
   * @param {API.MultihashDigest} [options.containingMultihash]
   * @returns {AsyncIterable<API.VerifiableBlob>}
   */
  async *stream(targetMultihash, options) {
    const seenMultihashes = new Set() // Track yielded blobs to avoid repeated

    const indexRecordsIterator = this.indexReader.findRecords(
      targetMultihash,
      options
    )
    for await (const indexRecord of indexRecordsIterator) {
      yield* this.#processIndexRecords([indexRecord], seenMultihashes)
    }
  }

  /**
   * @param {API.IndexRecord[]} indexRecords
   * @param {Set<API.MultihashDigest>} seenMultihashes - Set of already yielded multihashes
   * @returns {AsyncIterable<API.VerifiableBlob>}
   */
  async *#processIndexRecords(indexRecords, seenMultihashes) {
    /** @type {Map<string, API.LocationRecord[]>} */
    const locationsToRead = new Map() // Map: pack location → [{ offset, length, multihash }]

    // 1. Organize Blobs by Pack location to read
    for (const record of indexRecords) {
      if (record.type === IndexRecordType.BLOB) {
        /* c8 ignore next 1 */
        if (seenMultihashes.has(record.multihash)) continue // Skip duplicates
        seenMultihashes.add(record.multihash)

        const { location, offset, length, multihash } = record
        if (offset !== undefined && length !== undefined) {
          const encodedLocation = encodeLocation(location)
          let blobs = locationsToRead.get(encodedLocation)
          if (!blobs) {
            blobs = []
            locationsToRead.set(encodedLocation, blobs)
          }
          blobs.push({ offset, length, multihash })
        }
      } else if (record.type === IndexRecordType.PACK) {
        // PACK
        if (record.subRecords.length > 0) {
          yield* this.#processIndexRecords(record.subRecords, seenMultihashes)
          // Only known location is the pack itself, so we can just read it all
        } else {
          const encodedLocation = encodeLocation(record.location)
          // Add the full pack to the read map
          if (!locationsToRead.has(encodedLocation)) {
            locationsToRead.set(encodedLocation, []) // Empty range means "read all"
          }
        }
      } else if (record.type === IndexRecordType.CONTAINING) {
        // CONTAINING
        yield* this.#processIndexRecords(record.subRecords, seenMultihashes)
      }
    }

    // 2. Read data for each Pack in batches and stream results
    for (const [encodedLocation, blobRanges] of locationsToRead.entries()) {
      const location = decodeLocation(encodedLocation)
      for await (const { multihash, bytes } of this.packReader.stream(
        location,
        blobRanges.length > 0 ? blobRanges : undefined // Read full pack if no ranges
      )) {
        yield {
          multihash,
          bytes,
          type: Type.PLAIN,
        }
      }
    }
  }
}

/**
 * @param {string | API.MultihashDigest} location
 * @returns {string}
 */
function encodeLocation(location) {
  if (typeof location === 'string') {
    // Blob with a path location
    return `${LocationType.PATH}${location}`
  } else {
    // Blob with a multihash location
    return `${LocationType.MULTIHASH}${base58btc.encode(location.bytes)}`
  }
}

/**
 * @param {string} encodedLocation
 * @returns {string | API.MultihashDigest}
 */
function decodeLocation(encodedLocation) {
  if (encodedLocation.startsWith(`${LocationType.PATH}`)) {
    return encodedLocation.substring(1)
  } else if (encodedLocation.startsWith(`${LocationType.MULTIHASH}`)) {
    const multihash = encodedLocation.substring(1)
    return decodeDigest(base58btc.decode(multihash))
  }
  /* c8 ignore next 1 */
  throw new Error(`Invalid location type: ${encodedLocation}`)
}

/**
 * @enum {API.VerifiableBlobType}
 */
export const Type = Object.freeze({
  PLAIN: /** @type {API.VerifiableBlobType} */ (0),
})

/**
 * @enum {API.LocationType}
 */
const LocationType = Object.freeze({
  MULTIHASH: /** @type {API.LocationType} */ (0),
  PATH: /** @type {API.LocationType} */ (1),
})
