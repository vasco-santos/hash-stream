import * as API from './api.js'

/**
 * PackReader is responsible for reading packs from the store.
 *
 * @implements {API.PackReader}
 */
export class PackReader {
  /**
   *
   * @param {API.PackStoreStreamer} storeStreamer
   */
  constructor(storeStreamer) {
    this.storeStreamer = storeStreamer
  }

  /**
   * @param {API.MultihashDigest | API.Path} target
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  stream(target, ranges) {
    return this.storeStreamer.stream(target, ranges)
  }
}
