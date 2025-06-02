import { runIndexSchedulerTests } from './index.js'
import { createMemoryScheduler } from './constructs.browser.js'

describe('IndexScheduler implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'Memory',
      getIndexScheduler: createMemoryScheduler,
    },
  ].forEach(({ name, getIndexScheduler }) => {
    runIndexSchedulerTests(name, () => getIndexScheduler())
  })
})
