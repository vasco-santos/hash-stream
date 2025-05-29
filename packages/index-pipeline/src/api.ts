import { BlobLike } from '@web3-storage/upload-client/types'
import { MultihashDigest } from '@hash-stream/utils/index/types'

import { CreateUnixFsFileLikeStreamOptions } from '@hash-stream/utils/index/types'

export type { BlobLike, MultihashDigest }

export interface FileMetadata {
  key: string
  size?: number
}

export interface FileStore {
  /**
   * Lists all files available in the store.
   * Returns an iterable of file metadata or identifiers.
   */
  list(): AsyncIterable<FileMetadata>

  /**
   * Retrieves the file content (can be a stream or a Buffer/Uint8Array) for a given file reference.
   */
  get(fileReference: string): Promise<BlobLike | null>
}

export interface IndexScheduler {
  /**
   * Adds a file reference to the scheduling queue.
   * This may send an SQS message, HTTP POST, or push to a local queue.
   */
  add(fileReference: string, options?: IndexSchedulerAddOptions): Promise<void>
}

export interface IndexSchedulerAddOptions {
  format: string
  size?: number
}

export interface ScheduleStoreFilesOptions {
  format?: string
}

export interface ProcessFileForIndexingOptions
  extends CreateUnixFsFileLikeStreamOptions {}

export interface QueuedIndexTask {
  fileReference: string
  options?: IndexSchedulerAddOptions
}
