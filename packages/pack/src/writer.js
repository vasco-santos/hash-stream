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
   * @param {API.IndexWriter[]} [options.indexWriters]
   */
  constructor(storeWriter, { indexWriters } = {}) {
    this.storeWriter = storeWriter
    this.indexWriters = indexWriters
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
    if (!this.indexWriters || this.indexWriters.length === 0) {
      await drainStream(readable)
      return
    }

    if (options?.notIndexContaining) {
      // Tee the stream for multiple writers
      const teedStreams = teeMultipleStreams(readable, this.indexWriters.length)
      const indexWriters = this.indexWriters
      // Start processing all writers
      await Promise.all(
        teedStreams.map((stream, i) =>
          indexWriters[i].addBlobs(streamIndexData(stream.getReader()))
        )
      )
      return
    }

    const reader = readable.getReader()

    /** @type {import('@hash-stream/index/types').BlobIndexRecord[]} */
    const buffer = []
    /** @type {(value: any) => void} */
    let resolveNext // Resolver for awaiting new data
    let doneReading = false

    // A promise that resolves when new data is available
    let nextData = new Promise((resolve) => {
      resolveNext = resolve
    })

    // Start buffering eagerly
    const bufferingTask = (async () => {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer.push(value)
          // @ts-expect-error it is ised above
          resolveNext(true) // Notify bufferedStream that new data is available
          nextData = new Promise((resolve) => (resolveNext = resolve)) // Reset for the next item
        }
      } finally {
        doneReading = true
        // @ts-expect-error it is ised above
        resolveNext(true) // Ensure bufferedStream doesn't wait indefinitely
        reader.releaseLock()
      }
    })()

    bufferingTask.catch(() => {}) // Prevent unhandled rejections

    // Wait for the containing multihash before yielding data
    const containingMultihash = await containingPromise

    async function* bufferedStream() {
      while (buffer.length > 0 || !doneReading) {
        while (buffer.length > 0) {
          const record = buffer.shift() // Remove from buffer as we yield
          if (record) {
            yield record // Yield the buffered data
          }
        }
        if (!doneReading) {
          await nextData // Wait for new data if buffer is empty
        }
      }
    }

    // Multiplex streams to each index writer
    const streams = fanOutAsyncIterator(
      bufferedStream(),
      this.indexWriters.length
    )

    // Start processing all writers
    const indexWriters = this.indexWriters
    await Promise.all(
      indexWriters.map((indexWriter, i) =>
        indexWriter.addBlobs(streams[i], { containingMultihash })
      )
    )
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

/**
 * Tee a ReadableStream into multiple streams.
 *
 * @param {ReadableStream} readable
 * @param {number} n - The number of teed streams to create
 * @returns {ReadableStream[]} - Array of teed ReadableStreams
 */
function teeMultipleStreams(readable, n) {
  if (n <= 1) return [readable]

  // Use tee to split the stream into two
  let [first, second] = readable.tee()
  const streams = [first]

  // If n is greater than 2, tee the second stream and continue
  let currentStream = second
  /* c8 ignore next 5 */
  for (let i = 1; i < n - 1; i++) {
    const [newStream, remaining] = currentStream.tee()
    streams.push(newStream)
    currentStream = remaining
  }

  // Only push the last stream when we have more than two streams
  streams.push(currentStream)

  return streams
}

/**
 * Fans out an async iterator to N consumers, ensuring all get the same items in order.
 *
 * @template T
 * @param {AsyncIterable<T>} source - The source async iterable to fan out.
 * @param {number} n - The number of consumers to fan out to.
 * @returns {AsyncIterable<T>[]} - An array of async iterables, each receiving the same data.
 */
function fanOutAsyncIterator(source, n) {
  /** @type {AsyncIterable<T>[]} */
  const readers = []

  /** @type {T[]} */
  const buffer = []

  /** @type {boolean} */
  let done = false

  /** @type {{ resolve: (result: { value: T } | { done: true }) => void }[]} */
  let waiters = []

  /**
   * Fills the buffer with the next value from the source and notifies all waiters.
   */
  async function fillBuffer() {
    /* c8 ignore next 1 */
    if (done) return

    const iter = source[Symbol.asyncIterator]()
    const { value, done: isDone } = await iter.next()

    if (isDone) {
      done = true
      waiters.forEach(({ resolve }) => resolve({ done: true }))
      return
    }

    buffer.push(value)
    waiters.forEach(({ resolve }) => resolve({ value }))
    waiters = []
  }

  for (let i = 0; i < n; i++) {
    readers.push(
      (async function* () {
        let index = 0
        while (!done || index < buffer.length) {
          if (index < buffer.length) {
            yield buffer[index++]
          } else if (!done) {
            await new Promise((resolve) => waiters.push({ resolve }))
            if (index < buffer.length) {
              yield buffer[index++]
            }
          }
        }
      })()
    )
  }

  // eslint-disable-next-line no-extra-semi
  ;(async () => {
    while (!done) {
      await fillBuffer()
    }
  })()

  return readers
}
