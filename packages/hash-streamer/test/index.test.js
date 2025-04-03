import { MemoryContainingIndexStore } from '@hash-stream/index/store/memory-containing'
import { MemoryPackStore } from '@hash-stream/pack/store/memory'
import { runHashStreamTests } from './hash-streamer.js'
;[
  {
    name: 'Memory',
    /**
     * @returns {Promise<import('./hash-streamer.js').DestroyableIndexStore>}
     */
    getIndexStore: () => {
      const indexStore = new MemoryContainingIndexStore()
      const destroyableIndexStore = Object.assign(indexStore, {
        destroy: () => {},
      })
      return Promise.resolve(destroyableIndexStore)
    },
    /**
     * @returns {Promise<import('./hash-streamer.js').DestroyablePackStore>}
     */
    getPackStore: () => {
      const packStore = new MemoryPackStore()
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {},
      })
      return Promise.resolve(destroyablePackStore)
    },
  },
].forEach(({ name, getIndexStore, getPackStore }) => {
  runHashStreamTests(
    name,
    () => getIndexStore(),
    () => getPackStore()
  )
})
