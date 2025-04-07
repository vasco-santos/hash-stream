import { MemoryIndexStore } from '../src/store/memory.js'
import { runIndexStoreTests } from './store.js'

describe('IndexStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'Memory',
      /**
       * @returns {Promise<import('./store.js').DestroyableIndexStore>}
       */
      getIndexStore: () => {
        const indexStore = new MemoryIndexStore()
        const destroyableIndexStore = Object.assign(indexStore, {
          destroy: () => {},
        })
        return Promise.resolve(destroyableIndexStore)
      },
    },
  ].forEach(({ name, getIndexStore }) => {
    runIndexStoreTests(name, () => getIndexStore())
  })
})
