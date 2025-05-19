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
   * @param {API.MultihashDigest | API.Path} target
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  stream(target, ranges) {
    return this.storeReader.stream(target, ranges)
  }
}
