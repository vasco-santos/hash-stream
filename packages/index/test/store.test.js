import { MemoryBlobIndexStore } from '../src/store/memory-blob.js'
import { MemoryContainingIndexStore } from '../src/store/memory-containing.js'

import { runBlobStoreTests } from './stores/blob.js'
import { runContainingStoreTests } from './stores/containing.js'

describe('BlobIndexStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'Memory',
      /**
       * @returns {Promise<import('./stores/blob.js').DestroyableIndexStore>}
       */
      getIndexStore: () => {
        const indexStore = new MemoryBlobIndexStore()
        const destroyableIndexStore = Object.assign(indexStore, {
          destroy: () => {},
        })
        return Promise.resolve(destroyableIndexStore)
      },
    },
  ].forEach(({ name, getIndexStore }) => {
    runBlobStoreTests(name, () => getIndexStore())
  })
})

describe('ContainingIndexStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'Memory',
      /**
       * @returns {Promise<import('./stores/blob.js').DestroyableIndexStore>}
       */
      getIndexStore: () => {
        const indexStore = new MemoryContainingIndexStore()
        const destroyableIndexStore = Object.assign(indexStore, {
          destroy: () => {},
        })
        return Promise.resolve(destroyableIndexStore)
      },
    },
  ].forEach(({ name, getIndexStore }) => {
    runContainingStoreTests(name, () => getIndexStore())
  })
})
