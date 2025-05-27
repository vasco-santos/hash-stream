import { MemoryFileStore } from '../../src/file-store/memory.js'

export const getMemoryStore = async () => {
  const files = new Map()
  return Object.assign(new MemoryFileStore(files), {
    destroy: () => {},
    /**
     * @param {string} key
     * @param {Uint8Array} bytes
     */
    async put(key, bytes) {
      files.set(key, bytes)
    },
  })
}
