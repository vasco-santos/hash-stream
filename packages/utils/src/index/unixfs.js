import * as API from './api.js'
import * as PackAPI from '@hash-stream/pack/types'
import * as raw from 'multiformats/codecs/raw'
import * as UnixFS from '@vascosantos/unixfs'

import { withMaxChunkSize } from '@vascosantos/unixfs/file/chunker/fixed'
import { withWidth } from '@vascosantos/unixfs/file/layout/balanced'

export const MAX_CHUNK_SIZE = 1024 * 1024
export const defaultSettings = UnixFS.configure({
  fileChunkEncoder: raw,
  smallFileEncoder: raw,
  chunker: withMaxChunkSize(1024 * 1024),
  fileLayout: withWidth(1024),
})

/**
 * @param {PackAPI.BlobLike} blob
 * @param {string} path
 * @param {PackAPI.IndexWriter[]} indexWriters
 * @param {API.CreateUnixFsFileLikeStreamOptions} [options]
 * @returns {Promise<{ containingMultihash: API.MultihashDigest}>}
 */
export async function writeUnixFsFileLinkIndex(
  blob,
  path,
  indexWriters,
  options
) {
  if (!indexWriters || !indexWriters.length) {
    throw new Error('No index writers provided')
  }
  // Create a UnixFS file link stream
  const unixFsFileLinkStream = createUnixFsFileLinkStream(blob, options)

  // If we should *not* index the containing multihash → stream lazily
  if (options?.notIndexContaining) {
    // Tee the stream for multiple writers
    const teedStreams = teeMultipleStreams(
      unixFsFileLinkStream,
      indexWriters.length
    )

    // Prepare promise to get containing multihash
    // This will be resolved when the last stream is processed
    /** @type {(mh: API.MultihashDigest) => void} */
    let resolveLast
    const lastMultihashPromise = new Promise((resolve) => {
      resolveLast = resolve
    })

    // Start processing all writers
    await Promise.all(
      teedStreams.map((stream, i) =>
        indexWriters[i].addBlobs(
          streamIndexData(
            stream.getReader(),
            path,
            i === 0 ? resolveLast : undefined
          )
        )
      )
    )

    /** @type {API.MultihashDigest} */
    const lastMultihash = await lastMultihashPromise
    return { containingMultihash: lastMultihash }
  }

  // Buffering mode to precompute containingMultihash first
  const unixFsFileLinkEntries = await readAll(unixFsFileLinkStream)

  const containingMultihash =
    unixFsFileLinkEntries[unixFsFileLinkEntries.length - 1].cid.multihash

  // Start processing all writers
  await Promise.all(
    indexWriters.map((indexWriter, i) =>
      indexWriter.addBlobs(
        (async function* () {
          for (const entry of unixFsFileLinkEntries) {
            yield {
              multihash: entry.cid.multihash,
              location: path,
              offset: entry.contentByteOffset || 0,
              length: entry.contentByteLength,
            }
          }
        })(),
        { containingMultihash }
      )
    )
  )

  return {
    containingMultihash,
  }
}

// Adapted from @web3-storage/upload-client
/**
 * @param {PackAPI.BlobLike} blob
 * @param {API.CreateUnixFsFileLikeStreamOptions} [options]
 * @returns {ReadableStream<import('@vascosantos/unixfs').FileLink>}
 */
export function createUnixFsFileLinkStream(
  blob,
  options = {
    settings: defaultSettings,
  }
) {
  const settings = options?.settings ?? defaultSettings

  // Set up metadata stream
  const { readable: unixFsFileLinkReadable, writable: unixFsFileLinkWritable } =
    new TransformStream()

  // Pipe one branch into UnixFS for metadata indexing
  void (async () => {
    const unixfsWriter = UnixFS.createWriter({
      writable: new WritableStream(),
      // @ts-expect-error
      settings,
    })
    const unixFsFileLinkWriter = unixFsFileLinkWritable.getWriter()

    try {
      const fileBuilder = new UnixFSFileBuilder('', blob)

      await fileBuilder.finalize(unixfsWriter, {
        initOptions: {
          unixFsFileLinkWriter,
        },
      })
      await unixfsWriter.close()
    } finally {
      // Close the metadata stream when done
      await unixFsFileLinkWriter.close()
    }
  })()

  // Return the unixfs file links stream
  return unixFsFileLinkReadable
}

// from @web3-storage/upload-client
class UnixFSFileBuilder {
  #file
  /**
   * @param {string} name
   * @param {PackAPI.BlobLike} file
   */
  constructor(name, file) {
    this.name = name
    this.#file = file
  }
  /**
   * @param {import('@vascosantos/unixfs').View} writer
   * @param {Partial<import('@vascosantos/unixfs').FileWriterOptions>} [options]
   **/
  async finalize(writer, options = {}) {
    const unixfsFileWriter = UnixFS.createFileWriter({
      ...writer,
      ...options,
    })
    await this.#file.stream().pipeTo(
      new WritableStream({
        async write(chunk) {
          await unixfsFileWriter.write(chunk)
        },
      })
    )
    return await unixfsFileWriter.close()
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
 * Streams index data from a reader as an async generator.
 *
 * @param {ReadableStreamDefaultReader<import('@vascosantos/unixfs').FileLink>} reader
 * @param {string} path
 * @param {(mh: API.MultihashDigest) => void} [onLast]
 * @returns {AsyncGenerator<import('@hash-stream/index/types').BlobIndexRecord, void, unknown>}
 */
async function* streamIndexData(reader, path, onLast) {
  let lastSeen = undefined
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    lastSeen = value
    yield {
      multihash: value.cid.multihash,
      location: path,
      offset: value.contentByteOffset || 0,
      length: value.contentByteLength,
    }
  }

  if (onLast && lastSeen) {
    onLast(lastSeen.cid.multihash)
  }
}

/**
 * Reads all chunks from a ReadableStream and returns them as an array.
 *
 * @template T
 * @param {ReadableStream<T>} stream
 * @returns {Promise<T[]>}
 */
async function readAll(stream) {
  const reader = stream.getReader()
  const chunks = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return chunks
}
