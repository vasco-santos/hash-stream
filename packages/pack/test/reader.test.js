import { MemoryContainingIndexStore } from '@hash-stream/index/store/memory-containing'
import { MemoryPackStore } from '../src/store/memory.js'

import { runPackReaderTests } from './reader.js'
;[
  {
    name: 'Memory',
    /**
     * @returns {import('./reader.js').DestroyablePackStore}
     */
    getPackStore: () => {
      const packStore = new MemoryPackStore()
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {},
      })
      return destroyablePackStore
    },
    /**
     * @returns {import('./reader.js').DestroyableIndexStore}
     */
    getIndexStore: () => {
      const indexStore = new MemoryContainingIndexStore()
      const destroyableIndexStore = Object.assign(indexStore, {
        destroy: () => {},
      })
      return destroyableIndexStore
    },
  },
].forEach(({ name, getPackStore, getIndexStore }) => {
  runPackReaderTests(
    name,
    () => getPackStore(),
    () => getIndexStore()
  )
})
