import * as API from './api.js'

/**
 * VerifiableReader is responsible for TODOTODOTODO
 *
 * @implements {API.VerifiableReader}
 */
export class VerifiableReader {
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
    const indexRecordsStream = await this.indexReader.findRecords(
      targetMultihash,
      options
    )
    if (!indexRecordsStream) {
      return emptyAsyncIterable()
    }
    // TODO
    const s = this.indexReader.stream(targetMultihash)
    return emptyAsyncIterable()
  }
}

/**
 * @returns {AsyncIterable<API.VerifiableBlob>}
 */
async function* emptyAsyncIterable() {
  // Yields nothing, effectively returning an empty async iterable
}
