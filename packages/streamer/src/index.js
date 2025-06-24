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
      } else if (record.type === IndexRecordType.INLINE_BLOB) {
        // INLINE_BLOB

        // Skip duplicates
        /* c8 ignore next 1 */
        if (seenMultihashes.has(record.multihash)) continue
        // Skip if location is a string given it would not be a valid inline blob
        /* c8 ignore next 1 */
        if (typeof record.location === 'string') continue

        // Yield inline blob directly as location is encoded as identity multihash
        yield {
          multihash: record.multihash,
          bytes: record.location.digest,
          type: Type.PLAIN,
        }
        seenMultihashes.add(record.multihash)
      }
    }

    // 2. Read data for each Pack in batches and stream results
    for (const [encodedLocation, blobRanges] of locationsToRead.entries()) {
      const location = decodeLocation(encodedLocation)
      const ranges = filterFullyCoveredRanges(blobRanges)
      for await (const { multihash, bytes } of this.packReader.stream(
        location,
        ranges.length > 0 ? ranges : undefined // Read full pack if no ranges
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
 * Filters out ranges that fully cover other ranges.
 *
 * In other words, this removes any range that completely includes at least one other range.
 *
 * @param {Array<{
 *   offset: number;
 *   length: number;
 *   multihash: API.MultihashDigest;
 * }>} ranges - Array of ranges to filter.
 * @returns {Array<{
 *   offset: number;
 *   length: number;
 *   multihash: API.MultihashDigest;
 * }>} Filtered array with large covering ranges removed.
 */
function filterFullyCoveredRanges(ranges) {
  return ranges.filter((range, i) => {
    // Check if this range fully covers any other range (except itself)
    return !ranges.some((other, j) => {
      if (i === j) return false

      const rangeStart = range.offset
      const rangeEnd = range.offset + range.length
      const otherStart = other.offset
      const otherEnd = other.offset + other.length

      // Does current range fully cover the other range?
      return rangeStart <= otherStart && rangeEnd >= otherEnd
    })
  })
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
