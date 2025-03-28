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
   */
  stream(targetMultihash) {
    return this.storeReader.stream(targetMultihash)
  }
}
