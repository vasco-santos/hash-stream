import { MemoryPackStore } from '../src/store/memory.js'

import { runPackTests } from './pack.js'
;[
  {
    name: 'Memory',
    /**
     * @returns {Promise<import('./pack.js').DestroyablePackStore>}
     */
    getPackStore: () => {
      const packStore = new MemoryPackStore()
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {},
      })
      return Promise.resolve(destroyablePackStore)
    },
  },
].forEach(({ name, getPackStore }) => {
  runPackTests(name, () => getPackStore())
})
