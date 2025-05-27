import * as API from '../api.js'

/**
 * In-memory implementation of the IndexScheduler interface.
 *
 * Useful for local development, testing, or single-process applications.
 *
 * @implements {API.IndexScheduler}
 */
export class MemoryIndexScheduler {
  /**
   * @param {API.QueuedIndexTask[]} queue - The queue to use for scheduling index tasks.
   */
  constructor(queue) {
    this.queue = queue
  }

  /**
   * Adds a file reference to the local in-memory queue.
   *
   * @param {string} fileReference - The identifier of the file to be indexed.
   * @param {API.IndexSchedulerAddOptions} [options] - Additional metadata such as format and size.
   * @returns {Promise<void>}
   */
  async add(fileReference, options) {
    this.queue.push({ fileReference, options })
  }
}
