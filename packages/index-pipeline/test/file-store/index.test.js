import { MemoryFileStore } from '../../src/file-store/memory.js'
import { runFileStoreTests } from './index.js'

describe('FileStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'Memory',
      /**
       * @returns {Promise<import('./index.js').DestroyableAndUpdatableFileStore>}
       */
      getFileStore: () => {
        /** @type {Map<string, Uint8Array>} */
        const files = new Map()
        const fileStore = new MemoryFileStore(files)
        const fileStoreImplementation = Object.assign(fileStore, {
          destroy: () => {},
          /**
           *
           * @param {string} key
           * @param {Uint8Array} bytes
           */
          put: async (key, bytes) => {
            // Simulate storing bytes in memory
            files.set(key, bytes)
          },
        })
        return Promise.resolve(fileStoreImplementation)
      },
    },
  ].forEach(({ name, getFileStore }) => {
    runFileStoreTests(name, () => getFileStore())
  })
})
