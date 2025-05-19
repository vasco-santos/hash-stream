import * as API from './api.js'

import { decode as decodeDigest } from 'multiformats/hashes/digest'

/**
 * @implements {API.IndexRecord}
 */
export class IndexRecord {
  /**
   * @param {API.MultihashDigest} multihash
   * @param {API.IndexRecordType} type
   * @param {API.Location} location
   * @param {API.IndexRecord[]} subRecords
   * @param {object} [options]
   * @param {number} [options.offset]
   * @param {number} [options.length]
   */
  constructor(multihash, type, location, subRecords, { offset, length } = {}) {
    this.multihash = multihash
    this.type = type
    this.location = location
    this.subRecords = subRecords
    this.offset = offset
    this.length = length
  }
}

/**
 * @param {API.IndexRecord} record
 * @returns {API.IndexRecordEncoded}
 */
export function encode(record) {
  // Encode location based on either string for path and bytes for Multihash
  const location =
    typeof record.location === 'string'
      ? record.location
      : record.location.bytes

  return {
    multihash: record.multihash.bytes,
    type: record.type,
    location,
    subRecords: record.subRecords.map((r) => encode(r)),
    offset: record.offset,
    length: record.length,
  }
}

/**
 * @param {API.IndexRecordEncoded} encoded
 * @returns {API.IndexRecord}
 */
export function decode(encoded) {
  // Decode location based on either string for path and bytes for Multihash
  const location =
    typeof encoded.location === 'string'
      ? encoded.location
      : decodeDigest(encoded.location)

  return new IndexRecord(
    decodeDigest(encoded.multihash),
    encoded.type,
    location,
    encoded.subRecords.map(decode),
    { offset: encoded.offset, length: encoded.length }
  )
}

/**
 * @param {API.MultihashDigest} multihash
 * @param {API.IndexRecord[]} subRecords
 */
export function createFromContaining(multihash, subRecords) {
  return new IndexRecord(multihash, Type.CONTAINING, multihash, subRecords)
}

/**
 * @param {API.MultihashDigest} multihash
 * @param {API.Location} location
 * @param {API.IndexRecord[]} subRecords
 */
export function createFromPack(multihash, location, subRecords) {
  return new IndexRecord(multihash, Type.PACK, location, subRecords)
}

/**
 * @param {API.MultihashDigest} multihash
 * @param {API.Location} location
 * @param {number} offset
 * @param {number} length
 */
export function createFromBlob(multihash, location, offset, length) {
  return new IndexRecord(multihash, Type.BLOB, location, [], { offset, length })
}

/**
 * @enum {API.IndexRecordType}
 */
export const Type = Object.freeze({
  BLOB: /** @type {API.IndexRecordType} */ (0),
  PACK: /** @type {API.IndexRecordType} */ (1),
  CONTAINING: /** @type {API.IndexRecordType} */ (2),
})
