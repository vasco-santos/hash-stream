import * as API from './api.js'
import pDefer from 'p-defer'
import * as PackAPI from '@hash-stream/pack/types'
import * as raw from 'multiformats/codecs/raw'
import * as UnixFS from '@vascosantos/unixfs'

import { withMaxChunkSize } from '@vascosantos/unixfs/file/chunker/fixed'
import { withWidth } from '@vascosantos/unixfs/file/layout/balanced'

import { readAll, readLast } from './utils.js'

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
 * @param {PackAPI.IndexWriter[]} indexWriters}
 * @param {PackAPI.PackStoreWriter} packStoreWriter
 * @param {API.CreateUnixFsFileLikeStreamOptions} [options]
 * @returns {Promise<{ containingMultihash: API.MultihashDigest}>}
 */
export async function writeUnixFsFileLinkIndex(
  blob,
  path,
  indexWriters,
  packStoreWriter,
  options
) {
  if (!indexWriters || !indexWriters.length) {
    throw new Error('No index writers provided')
  }
  // Create a UnixFS file link stream
  const { unixFsFileLinkReadable, unixFsReadable } = createUnixFsStreams(
    blob,
    options
  )
  /** @type {import('p-defer').DeferredPromise<API.Block>} */
  const rootBlockDefer = pDefer()

  void (async () => {
    const rootBlock = await readLast(unixFsReadable)
    rootBlockDefer.resolve(rootBlock)
  })()

  // Buffering mode to precompute containingMultihash first
  const unixFsFileLinkEntries = await readAll(unixFsFileLinkReadable)

  const containingMultihash =
    unixFsFileLinkEntries[unixFsFileLinkEntries.length - 1].cid.multihash

  // Wait for the root block to be computed
  const rootBlock = await rootBlockDefer.promise

  // Write the root block to the store
  await packStoreWriter.put(rootBlock.cid.multihash, rootBlock.bytes)

  // Start processing all writers
  await Promise.all(
    indexWriters.map((indexWriter, i) =>
      indexWriter.addBlobs(
        (async function* () {
          for (const entry of unixFsFileLinkEntries) {
            // handle root CID as a special case
            // where the DAG is stored in the multihash location
            // of the root CID multihash
            if (entry.cid.equals(rootBlock.cid)) {
              yield {
                multihash: entry.cid.multihash,
                location: rootBlock.cid.multihash,
                offset: 0,
                length: entry.contentByteLength,
              }
            } else {
              yield {
                multihash: entry.cid.multihash,
                location: path,
                offset: entry.contentByteOffset || 0,
                length: entry.contentByteLength,
              }
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
 * @returns {API.UnixFsStreams}
 */
export function createUnixFsStreams(
  blob,
  options = {
    settings: defaultSettings,
  }
) {
  /* c8 ignore next 1 */
  const settings = options?.settings ?? defaultSettings

  // Set up file link stream
  const { readable: unixFsFileLinkReadable, writable: unixFsFileLinkWritable } =
    new TransformStream()
  // Set up unixfs stream
  const { readable: unixFsReadable, writable: unixFsWritable } =
    new TransformStream()

  // Pipe one branch into UnixFS for file link indexing
  void (async () => {
    const unixfsWriter = UnixFS.createWriter({
      writable: unixFsWritable,
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
  return { unixFsFileLinkReadable, unixFsReadable }
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
