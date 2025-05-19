import { MemoryIndexStore } from '@hash-stream/index/store/memory'
import { MemoryPackStore } from '../src/store/memory.js'

import { runPackReaderTests } from './reader.js'
;[
  {
    name: 'Memory',
    /**
     * @returns {Promise<import('./reader.js').DestroyablePackStore>}
     */
    getPackStore: () => {
      const packStore = new MemoryPackStore()
      const destroyablePackStore = Object.assign(packStore, {
        direntory: '',
        destroy: () => {},
      })
      // @ts-expect-error
      return Promise.resolve(destroyablePackStore)
    },
    /**
     * @returns {Promise<import('./reader.js').DestroyableIndexStore>}
     */
    getIndexStore: () => {
      const indexStore = new MemoryIndexStore()
      const destroyableIndexStore = Object.assign(indexStore, {
        direntory: '',
        destroy: () => {},
      })
      // @ts-expect-error
      return Promise.resolve(destroyableIndexStore)
    },
  },
].forEach(({ name, getPackStore, getIndexStore }) => {
  runPackReaderTests(
    name,
    () => getPackStore(),
    () => getIndexStore()
  )
})
