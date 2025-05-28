import * as API from '../api.js'

import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

/**
 * S3 implementation of FileStore
 *
 * @implements {API.FileStore}
 */
export class S3LikeFileStore {
  /**
   * @param {object} config - Configuration for the S3 client.
   * @param {string} config.bucketName - S3 bucket name.
   * @param {S3Client} config.client - S3 client instance.
   * @param {string} [config.prefix] - Optional prefix for stored objects.
   */
  constructor({ bucketName, client, prefix = '' }) {
    this.bucketName = bucketName
    this.prefix = prefix
    this.client = client
  }

  /**
   * Asynchronously yields all files in the bucket under the given prefix.
   *
   * @returns {AsyncIterable<API.FileMetadata>}
   */
  async *list() {
    let ContinuationToken
    let response

    do {
      response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: this.prefix,
          ContinuationToken,
        })
      )

      const contents = response.Contents || []

      for (const obj of contents) {
        if (!obj.Key) continue
        yield {
          key: obj.Key,
          size: obj.Size,
        }
      }

      ContinuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined
    } while (ContinuationToken)
  }

  /**
   * Retrieve file contents as a Uint8Array.
   *
   * @param {string} fileReference
   * @returns {Promise<API.BlobLike | null>}
   */
  async get(fileReference) {
    try {
      const { Body } = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileReference,
        })
      )
      /* c8 ignore next 1 */
      if (!Body) return null

      return {
        stream: () => Body.transformToWebStream(),
      }
    } catch (/** @type {any} */ err) {
      /* c8 ignore next 3 */
      if (err.name === 'NoSuchKey') return null
      throw err
    }
  }
}
