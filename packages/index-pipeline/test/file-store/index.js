import assert from 'assert'
import * as API from '../../src/api.js'

/**
 * @typedef {object} DestroyableAndUpdatable
 * @property {(key: string, bytes: Uint8Array) => Promise<void>} put
 * @property {() => void} destroy
 *
 * @typedef {API.FileStore & DestroyableAndUpdatable} DestroyableAndUpdatableFileStore
 */

/**
 * Runs the test suite for File Store.
 *
 * @param {string} storeName - The name of the store (e.g., "Memory", "FS").
 * @param {() => Promise<DestroyableAndUpdatableFileStore>} createFileStore - Function to create the file store.
 */
export function runFileStoreTests(storeName, createFileStore) {
  describe(`${storeName} FileStore`, () => {
    /** @type {DestroyableAndUpdatableFileStore} */
    let store

    const TEST_BYTES = new TextEncoder().encode('hello world')
    const TEST_KEY = 'hello.txt'

    beforeEach(async () => {
      store = await createFileStore()
    })

    afterEach(() => {
      store.destroy()
    })

    it('can store and retrieve a blob index record', async () => {
      await store.put(TEST_KEY, TEST_BYTES)

      const file = await store.get(TEST_KEY)
      assert(file, 'Expected file to be retrieved')

      const stream = file.stream()
      const reader = stream.getReader()

      const { value, done } = await reader.read()
      assert.deepStrictEqual(value, TEST_BYTES)
      assert.strictEqual(done, false)

      const end = await reader.read()
      assert.strictEqual(end.done, true)
    })

    it('returns null for nonexistent files', async () => {
      const file = await store.get('nonexistent-file.txt')
      assert.strictEqual(file, null)
    })

    it('lists stored files with correct metadata', async () => {
      await store.put(TEST_KEY, TEST_BYTES)

      const files = []
      for await (const file of store.list()) {
        files.push(file)
      }

      assert.strictEqual(files.length, 1)
      assert.strictEqual(files[0].key, TEST_KEY)
      assert.strictEqual(files[0].size, TEST_BYTES.length)
    })

    it('handles empty store without errors', async () => {
      const files = []
      for await (const file of store.list()) {
        files.push(file)
      }

      assert.strictEqual(files.length, 0)
    })
  })
}
