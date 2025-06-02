import * as API from '@hash-stream/pack/types'

/**
 * PackReader is responsible for reading packs from the store.
 * With the UnixFSPackReader, we can read both multihash digests and paths from different stores
 * behind the same reader. This is useful for keeping original raw files in a separate store and
 * UnixFS Dag files in another store.
 *
 * @implements {API.PackReader}
 */
export class UnixFsPackReader {
  /**
   * @param {API.PackStoreStreamer} packStoreStreamer
   * @param {API.PackStoreStreamer} pathStoreStreamer
   */
  constructor(packStoreStreamer, pathStoreStreamer) {
    this.storeStreamer = packStoreStreamer
    this.pathStoreStreamer = pathStoreStreamer
  }

  /**
   * @param {API.MultihashDigest | API.Path} target
   * @param {Array<{ offset: number, length?: number, multihash: API.MultihashDigest }>} [ranges]
   * @returns {AsyncIterable<API.VerifiableEntry>}
   */
  stream(target, ranges) {
    if (typeof target === 'string') {
      // If the target is a path, we need to resolve it from the path
      return this.pathStoreStreamer.stream(target, ranges)
    }
    // If the target is a multihash digest, we can stream directly from the pack store
    return this.storeStreamer.stream(target, ranges)
  }
}
