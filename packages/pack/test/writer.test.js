import { MemoryContainingIndexStore } from '@hash-stream/index/store/memory-containing'
import { MemoryPackStore } from '../src/store/memory.js'

import { runPackWriterTests } from './writer.js'
;[
  {
    name: 'Memory',
    /**
     * @returns {Promise<import('./writer.js').DestroyablePackStore>}
     */
    getPackStore: () => {
      const packStore = new MemoryPackStore()
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {},
      })
      return Promise.resolve(destroyablePackStore)
    },
    /**
     * @returns {Promise<import('./writer.js').DestroyableIndexStore>}
     */
    getIndexStore: () => {
      const indexStore = new MemoryContainingIndexStore()
      const destroyableIndexStore = Object.assign(indexStore, {
        destroy: () => {},
      })
      return Promise.resolve(destroyableIndexStore)
    },
  },
].forEach(({ name, getPackStore, getIndexStore }) => {
  runPackWriterTests(
    name,
    () => getPackStore(),
    () => getIndexStore()
  )
})
