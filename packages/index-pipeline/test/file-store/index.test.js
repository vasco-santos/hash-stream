import { runFileStoreTests } from './index.js'

import { getMemoryStore } from './constructs.browser.js'

describe('FileStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'Memory',
      getFileStore: getMemoryStore,
    },
  ].forEach(({ name, getFileStore }) => {
    runFileStoreTests(name, () => getFileStore())
  })
})
