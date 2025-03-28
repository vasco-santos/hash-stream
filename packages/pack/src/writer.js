import * as API from './api.js'

import { CarIndexer } from '@ipld/car'

import { createPacks } from './index.js'

/**
 * PackWriter is responsible for creating and storing packs from a given
 * blob, as well as managing the index data and storing it.
 *
 * @implements {API.PackWriter}
 */
export class PackWriter {
  /**
   * Constructs a PackWriter instance to handle pack storage and indexing.
   *
   * @param {API.PackStore} storeWriter
   * @param {object} [options]
   * @param {API.IndexWriter} [options.indexWriter]
   */
  constructor(storeWriter, { indexWriter } = {}) {
    this.storeWriter = storeWriter
    this.indexWriter = indexWriter
  }

  /**
   * Writes the given blob into a set of packs and stores them.
   * The function will parallelize the storing of packs and writing the index data if
   * an Index Writer is set.
   *
   * @param {import('@web3-storage/upload-client/types').BlobLike} blob
   * @param {API.PackWriterWriteOptions} [options]
   * @returns {Promise<{containingMultihash: API.MultihashDigest, packsMultihashes: API.MultihashDigest[]}>}
   */
  async write(blob, options) {
    const { packStream, containingPromise } = createPacks(blob, options)
    /** @type {API.MultihashDigest[]} */
    const packsMultihashes = []

    // Create a WritableStream to feed data into index data from the pack stream
    const { writable, readable } = new TransformStream()
    const writer = writable.getWriter()

    // Run both storing pack storage and indexing in parallel
    await Promise.all([
      this.#storePacks(packStream, writer, packsMultihashes, options),
      this.#storeIndex(readable, containingPromise, options),
    ])

    // Await the containing multihash, which is derived from the pack data
    const containingMultihash = await containingPromise
    return { containingMultihash, packsMultihashes }
  }

  /**
   * Stores the individual packs and writes their index data into the provided writer.
   * This function parses the Pacls and stores each pack while also extracting index data,
   * which is piped to a writable stream.
   *
   * @param {AsyncIterable<{ multihash: API.MultihashDigest, bytes: Uint8Array }>} packStream
   * @param {WritableStreamDefaultWriter} writer
   * @param {API.MultihashDigest[]} packsMultihashes
   * @param {API.PackWriterWriteOptions} [options]
   */
  async #storePacks(packStream, writer, packsMultihashes, options) {
    try {
      // Iterate through each pack in the pack stream
      for await (const { multihash, bytes } of packStream) {
        // Keep track of the blob multihash
        /** @type {API.MultihashDigest[]} */
        const blobMultihashes = []
        // Parse the CAR file to extract index data for each blob
        const blobIterable = await CarIndexer.fromBytes(bytes)
        for await (const blob of blobIterable) {
          // Write the extracted index data to the writer
          await writer.write({
            multihash: blob.cid.multihash, // The multihash of the blob
            location: multihash, // The multihash of the pack
            offset: blob.blockOffset, // The offset of the blob in the pack
            length: blob.blockLength, // The length of the blob in the pack
          })
          // Keep track of the blobs of the pack
          blobMultihashes.push(blob.cid.multihash)
        }

        // Store the pack (actual data) into the store
        await this.storeWriter.put(multihash, bytes)
        // Keep track of the multihash for the pack
        packsMultihashes.push(multihash)
        options?.onPackWrite?.(multihash, blobMultihashes)
      }
    } finally {
      // Ensure writer is closed once all data is processed
      await writer.close()
    }
  }

  /**
   * Processes the index data and writes it to the `addBlobs` method of the indexWriter.
   * The function handles buffering when `containingPromise` is a dependency and streams index data.
   *
   * @param {ReadableStream<import('@hash-stream/index/types').BlobIndexRecord>} readable
   * @param {Promise<API.MultihashDigest>} containingPromise
   * @param {API.PackWriterWriteOptions} [options]
   */
  async #storeIndex(readable, containingPromise, options) {
    if (!this.indexWriter) {
      // If no index writer is provided, simply drain the stream to avoid blocking
      await drainStream(readable)
      return
    }

    const reader = readable.getReader()

    // When 'notIndexContaining' option is provided, stream data directly without buffering
    // given that the containing multihash is not needed for the index data
    if (options?.notIndexContaining) {
      await this.indexWriter.addBlobs(streamIndexData(reader))
      return
    }

    // Buffer the stream if `containingPromise` is required
    /** @type {import('@hash-stream/index/types').BlobIndexRecord[]} */
    const buffer = []
    let reading = true

    async function bufferIndexData() {
      try {
        // Eagerly read data and push to buffer until stream is done
        while (reading) {
          const { value, done } = await reader.read()
          if (done) break
          buffer.push(value)
        }
      } finally {
        reading = false
        // Release the lock once we're done processing the stream in bufferIndexData
        reader.releaseLock()
      }
    }

    // Start reading in the background to keep the process non-blocking
    // eslint-disable-next-line no-extra-semi
    ;(async () => {
      // eslint-disable-next-line no-empty
      await bufferIndexData()
    })()

    // Wait for the containing multihash to resolve so that it can be used in the index data
    const containingMultihash = await containingPromise

    // Yield the buffered data once the containing multihash is ready
    async function* bufferedStream() {
      // First yield the buffered data
      yield* buffer
      // After buffer is empty, we continue reading lazily from the stream
      while (reading) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }
        /* c8 ignore next 2 */
        yield value
      }

      // Release the lock after we've finished reading lazily
      reader.releaseLock()
    }

    await this.indexWriter.addBlobs(bufferedStream(), { containingMultihash })
  }
}

/**
 * Drains a readable stream by reading and discarding all its content.
 * This prevents the stream from blocking when not in use.
 *
 * @param {ReadableStream} readable
 */
async function drainStream(readable) {
  const reader = readable.getReader()
  // eslint-disable-next-line no-empty
  while (!(await reader.read()).done) {} // Continuously read & discard data
}

/**
 * Streams index data from a reader as an async generator.
 *
 * @param {ReadableStreamDefaultReader<import('@hash-stream/index/types').BlobIndexRecord>} reader
 * @returns {AsyncGenerator<import('@hash-stream/index/types').BlobIndexRecord, void, unknown>}
 */
async function* streamIndexData(reader) {
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    yield value
  }
}
