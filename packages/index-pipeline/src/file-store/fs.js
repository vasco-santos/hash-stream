import * as API from '../api.js'

import * as fs from 'fs/promises'
import * as path from 'path'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

/**
 * Recursively walk a directory and yield FileMetadata
 *
 * @param {string} rootDir - Base directory used to calculate relative paths
 * @param {string} currentDir - Directory currently being traversed
 * @returns {AsyncGenerator<API.FileMetadata>}
 */
async function* walkDirectory(rootDir, currentDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      yield* walkDirectory(rootDir, fullPath)
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath)
      yield {
        key: path.relative(rootDir, fullPath),
        size: stat.size,
      }
    }
  }
}

/**
 * FileSystem implementation of FileStore
 *
 * @implements {API.FileStore}
 */
export class FSFileStore {
  /**
   * @param {string} directory - Root directory to list files from
   */
  constructor(directory) {
    this.directory = directory
  }

  /**
   * List all files recursively under the configured directory
   *
   * @returns {AsyncIterable<API.FileMetadata>}
   */
  async *list() {
    yield* walkDirectory(this.directory, this.directory)
  }

  /**
   * Retrieve a file stream by relative fileReference
   *
   * @param {string} fileReference
   * @returns {Promise<API.BlobLike | null>}
   */
  async get(fileReference) {
    const fullPath = path.join(this.directory, fileReference)
    try {
      await fs.access(fullPath)
      const nodeStream = createReadStream(fullPath)
      return {
        // @ts-expect-error the stream types are slightly different
        stream: () => Readable.toWeb(nodeStream),
      }
    } catch {
      return null
    }
  }
}
