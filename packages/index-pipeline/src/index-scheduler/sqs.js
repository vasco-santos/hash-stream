import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import * as API from '../api.js'

/**
 * SQS-based implementation of the IndexScheduler interface.
 *
 * This scheduler sends file indexing tasks to an Amazon SQS queue.
 *
 * @implements {API.IndexScheduler}
 */
export class SQSLikeIndexScheduler {
  /**
   * Constructs a new SQSIndexScheduler.
   *
   * @param {object} config - Configuration for the SQS client and target queue URL.
   * @param {SQSClient} config.client - An initialized SQSClient instance.
   * @param {string} config.queueUrl - The URL of the SQS queue to send messages to.
   */
  constructor(config) {
    this.sqs = config.client
    this.queueUrl = config.queueUrl
  }

  /**
   * Adds a file reference to the SQS queue for indexing.
   *
   * @param {string} fileReference - The identifier of the file to be indexed.
   * @param {API.IndexSchedulerAddOptions} [options] - Additional metadata such as format and size.
   * @returns {Promise<void>}
   */
  async add(fileReference, options) {
    const messageBody = JSON.stringify({
      fileReference,
      options: {
        format: options?.format,
        size: options?.size,
      },
    })

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: messageBody,
    })

    await this.sqs.send(command)
  }
}
