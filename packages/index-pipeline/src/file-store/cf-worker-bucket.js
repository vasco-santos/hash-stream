import * as API from '../api.js'

/**
 * Cloudflare Workers R2 implementation of FileStore.
 *
 * @implements {API.FileStore}
 */
export class CloudflareWorkerBucketFileStore {
  /**
   * @param {object} config - Configuration for the R2 client.
   * @param {import('@cloudflare/workers-types').R2Bucket} config.bucket - R2 bucket instance in a Worker.
   * @param {string} [config.prefix] - Optional prefix for stored objects.
   */
  constructor({ bucket, prefix = '' }) {
    this.bucket = bucket
    this.prefix = prefix
  }

  /**
   * Asynchronously yields all files in the bucket under the given prefix.
   *
   * @returns {AsyncIterable<API.FileMetadata>}
   */
  async *list() {
    let cursor
    let listResult

    while (true) {
      listResult = await this.bucket.list({
        prefix: this.prefix,
        cursor,
      })

      for (const obj of listResult.objects) {
        yield {
          key: obj.key,
          size: obj.size,
        }
      }

      if (!listResult.truncated) {
        break
      }
      cursor = listResult.cursor
    }
  }

  /**
   * Retrieve file contents as a BlobLike object.
   *
   * @param {string} fileReference
   * @returns {Promise<API.BlobLike | null>}
   */
  async get(fileReference) {
    const key = fileReference.startsWith(this.prefix)
      ? fileReference
      : `${this.prefix}${fileReference}`

    const obj = await this.bucket.get(key)
    if (!obj) return null

    return {
      // @ts-expect-error the stream types are slightly different
      stream: () => obj.body,
    }
  }
}
