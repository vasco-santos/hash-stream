import { runIndexSchedulerTests } from './index.js'
import { getMemoryScheduler } from './constructs.browser.js'

describe('IndexScheduler implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'Memory',
      getIndexScheduler: getMemoryScheduler,
    },
  ].forEach(({ name, getIndexScheduler }) => {
    runIndexSchedulerTests(name, () => getIndexScheduler())
  })
})
