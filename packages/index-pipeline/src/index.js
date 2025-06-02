/* global console */

import * as API from './api.js'

import {
  writeUnixFsFileLinkIndex,
  defaultSettings,
} from '@hash-stream/utils/index/unixfs'
import { withMaxChunkSize } from '@ipld/unixfs/file/chunker/fixed'

/**
 * Function that prepares files for indexing by listing them in the file store
 * and sending a reference of each file to an Index scheduler.
 * This function is useful for setting up a schedule-based indexing processor where files
 * need to be processed asynchronously. It can be a Queue, a message broker, or even a
 * simple HTTP endpoint that accepts file references for processing.
 *
 * @param {API.FileStore} fileStore
 * @param {API.IndexScheduler} indexScheduler
 * @param {API.ScheduleStoreFilesOptions} options
 * @returns {AsyncIterable<string>}
 */
export async function* scheduleStoreFilesForIndexing(
  fileStore,
  indexScheduler,
  options = {}
) {
  const format = options.format || 'unixfs'
  for await (const fileMetadata of fileStore.list()) {
    await indexScheduler.add(fileMetadata.key, {
      format,
      size: fileMetadata.size,
    })
    yield fileMetadata.key
  }
}

/**
 * Scheduler consumer function where a file reference is fetched from the store,
 * processed, and then written to the index store.
 * This function is designed to be used in a queue consumer that listens for
 * messages from the index scheduler. It fetches the file reference from the file store,
 * processes the file content using the specified index format, and writes the processed
 * content to the index store using the provided index writer.
 *
 * @param {API.FileStore} fileStore
 * @param {import('@hash-stream/pack/types').PackStoreWriter} packStoreWriter
 * @param {import('@hash-stream/index/types').IndexWriter[]} indexWriters
 * @param {string} indexFormat
 * @param {string} fileReference
 * @param {API.ProcessFileForIndexingOptions} [options={}]
 * @returns {Promise<API.MultihashDigest>}
 */
export async function processFileForIndexing(
  fileStore,
  packStoreWriter,
  indexWriters,
  indexFormat,
  fileReference,
  options = {}
) {
  // Read the file from the file store
  const blob = await fileStore.get(fileReference)
  if (!blob) {
    throw new Error(`File not found: ${fileReference}`)
  }

  // Process the file content using the specified format (e.g., UnixFS)
  if (indexFormat === 'unixfs') {
    // Write the processed content to the index store using the index writer provided
    const written = await writeUnixFsFileLinkIndex(
      blob,
      fileReference,
      indexWriters,
      packStoreWriter,
      {
        settings: {
          ...defaultSettings,
          chunker: withMaxChunkSize(1024 * 1024),
        },
        ...options,
      }
    )
    console.log(`File ${fileReference} indexed successfully.`)
    // Return the containing multihash for further processing if needed
    return written.containingMultihash
  } else {
    throw new Error(`Unsupported index format: ${indexFormat}`)
  }
}
