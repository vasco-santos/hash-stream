import * as API from '../api.js'

/**
 * In-memory implementation of FileStore
 *
 * @implements {API.FileStore}
 */
export class MemoryFileStore {
  /**
   * @param {Map<string, Uint8Array>} files
   */
  constructor(files) {
    this.files = files
  }

  /**
   * @returns {AsyncIterable<API.FileMetadata>}
   */
  async *list() {
    for (const [key, data] of this.files.entries()) {
      yield {
        key,
        size: data.byteLength,
      }
    }
  }

  /**
   * @param {string} fileReference
   * @returns {Promise<API.BlobLike | null>}
   */
  async get(fileReference) {
    const data = this.files.get(fileReference)
    if (!data) return null

    return {
      stream: () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(data)
            controller.close()
          },
        }),
    }
  }
}
