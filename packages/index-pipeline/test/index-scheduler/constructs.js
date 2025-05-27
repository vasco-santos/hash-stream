/* global setTimeout */

import * as API from '../../src/api.js'

import { Consumer } from 'sqs-consumer'
import pDefer from 'p-defer'

import { SQSLikeIndexScheduler } from '../../src/index-scheduler/sqs.js'

import { createQueue, createSQS } from '../helpers/resources.js'

/**
 * @param {number} [messageTarget]
 */
export const getSQSLikeScheduler = async (messageTarget = 0) => {
  const { client: sqsClient } = await createSQS()
  const queueUrl = await createQueue(sqsClient)
  /** @type {API.QueuedIndexTask[]} */
  const queuedIndexTasks = []
  const queueConsumerDeferred = pDefer()
  let messageCount = 0

  const scheduler = new SQSLikeIndexScheduler({ client: sqsClient, queueUrl })
  const consumer = Consumer.create({
    queueUrl,
    sqs: sqsClient,
    handleMessage: (message) => {
      // @ts-ignore JSON parse does not guarantee type
      queuedIndexTasks.push(JSON.parse(message.Body))
      messageCount++
      if (messageCount === messageTarget) {
        queueConsumerDeferred.resolve()
      }
      return Promise.resolve()
    },
  })
  consumer.start()

  return Object.assign(scheduler, {
    destroy: () => {
      consumer.stop()
    },
    async *drain() {
      await queueConsumerDeferred.promise
      while (queuedIndexTasks.length) {
        await new Promise((resolve) => setTimeout(resolve, 0))
        const task = queuedIndexTasks.shift()
        if (task) yield task
      }
    },
  })
}
