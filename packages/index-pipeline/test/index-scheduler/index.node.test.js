/* global setTimeout */

import * as API from '../../src/api.js'

import { Consumer } from 'sqs-consumer'
import pDefer from 'p-defer'

import { SQSLikeIndexScheduler } from '../../src/index-scheduler/sqs.js'
import { runIndexSchedulerTests } from './index.js'

import { createQueue, createSQS } from '../helpers/resources.js'

describe('IndexScheduler implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'SQSLike',
      /**
       * @returns {Promise<import('./index.js').DestroyableAndDrainableIndexScheduler>}
       */
      getIndexScheduler: async () => {
        const { client: sqsClient } = await createSQS()
        const queueUrl = await createQueue(sqsClient)
        /** @type {API.QueuedIndexTask[]} */
        const queuedIndexTasks = []
        const queueConsumerDeferred = pDefer()

        const indexScheduler = new SQSLikeIndexScheduler({
          client: sqsClient,
          queueUrl,
        })

        const queueConsumer = Consumer.create({
          queueUrl,
          sqs: sqsClient,
          handleMessage: (message) => {
            // @ts-ignore not same format because JSON parse
            queuedIndexTasks.push(JSON.parse(message.Body))
            queueConsumerDeferred.resolve()
            return Promise.resolve()
          },
        })
        queueConsumer.start()

        const indexSchedulerImplementation = Object.assign(indexScheduler, {
          destroy: () => {
            queueConsumer.stop()
          },
          /**
           * @returns {AsyncGenerator<API.QueuedIndexTask>}
           */
          async *drain() {
            // Await for the first message to be processed
            // This ensures that the queueConsumerDeferred is resolved before we start yielding tasks
            await queueConsumerDeferred.promise
            while (queuedIndexTasks.length) {
              // Simulate async delay
              await new Promise((resolve) => setTimeout(resolve, 0))
              const task = queuedIndexTasks.shift()
              if (task) {
                yield task
              }
            }
          },
        })
        return Promise.resolve(indexSchedulerImplementation)
      },
    },
  ].forEach(({ name, getIndexScheduler }) => {
    runIndexSchedulerTests(name, () => getIndexScheduler())
  })
})
