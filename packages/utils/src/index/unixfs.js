import * as API from './api.js'
import * as PackAPI from '@hash-stream/pack/types'
import * as raw from 'multiformats/codecs/raw'
import * as UnixFS from '@vascosantos/unixfs'

import { withMaxChunkSize } from '@vascosantos/unixfs/file/chunker/fixed'
import { withWidth } from '@vascosantos/unixfs/file/layout/balanced'

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
 */
// @returns {ReadableStream<import('@vascosantos/unixfs').FileLink>}
export async function writeUnixFsFileLinkIndex(
  blob,
  path,
  indexWriters,
  options
) {
  const unixFsFileLinkStream = createUnixFsFileLinkStream(blob, options)

  // TODO: how to write?
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
