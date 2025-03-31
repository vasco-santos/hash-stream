import * as API from './api.js'

/**
 * PackReader is responsible for reading packs from the store.
 *
 * @implements {API.PackReader}
 */
export class PackReader {
  /**
   *
   * @param {API.PackStoreReader} storeReader
   */
  constructor(storeReader) {
    this.storeReader = storeReader
  }

  /**
   * @param {API.MultihashDigest} targetMultihash
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  stream(targetMultihash, ranges) {
    return this.storeReader.stream(targetMultihash, ranges)
  }
}
