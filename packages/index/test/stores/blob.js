import assert from 'assert'

import { equals } from 'uint8arrays'
import all from 'it-all'

import { Type, createFromBlob } from '../../src/record.js'

import { randomCID } from '../helpers/random.js'

/**
 * @typedef {import('@hash-stream/index/types').IndexStore} IndexStore
 *
 * @typedef {object} Destroyable
 * @property {() => void} destroy
 *
 * @typedef {IndexStore & Destroyable} DestroyableIndexStore
 */

/**
 * Runs the test suite for Blob Store.
 *
 * @param {string} storeName - The name of the store (e.g., "Memory", "FS").
 * @param {() => Promise<DestroyableIndexStore>} createIndexStore - Function to create the index store.
 */
export function runBlobStoreTests(storeName, createIndexStore) {
  describe(`${storeName} BlobIndexStore`, () => {
    /** @type {DestroyableIndexStore} */
    let store

    beforeEach(async () => {
      store = await createIndexStore()
    })

    afterEach(() => {
      store.destroy()
    })

    it('can store and retrieve a blob index record', async () => {
      const blobCid = await randomCID()
      const packCid = await randomCID()
      const offset = 0
      const length = 100

      const blob = createFromBlob(
        blobCid.multihash,
        packCid.multihash,
        offset,
        length
      )

      await store.add(
        (async function* () {
          yield blob
        })()
      )

      const records = await all(store.get(blob.multihash))
      assert(records.length === 1)
      assert.strictEqual(records[0].offset, offset)
      assert.strictEqual(records[0].length, length)
      assert(equals(records[0].location.digest, packCid.multihash.digest))
      assert(records[0].type === Type.BLOB)
    })

    it('can store a blob index record twice', async () => {
      const blobCid = await randomCID()
      const packCid = await randomCID()
      const offset = 0
      const length = 100

      const blob = createFromBlob(
        blobCid.multihash,
        packCid.multihash,
        offset,
        length
      )

      await store.add(
        (async function* () {
          yield blob
          yield blob
        })()
      )

      const records = await all(store.get(blob.multihash))
      assert(records.length === 1)
    })

    it('returns empty for non-existent entries', async () => {
      const blockCid = await randomCID()
      const retrieved = await all(store.get(blockCid.multihash))
      assert.deepEqual(retrieved, [])
    })

    it('can handle large offsets and lengths', async () => {
      const blobCid = await randomCID()
      const packCid = await randomCID()
      const offset = Number.MAX_SAFE_INTEGER
      const length = Number.MAX_SAFE_INTEGER

      const blob = createFromBlob(
        blobCid.multihash,
        packCid.multihash,
        offset,
        length
      )

      await store.add(
        (async function* () {
          yield blob
        })()
      )
      const records = await all(store.get(blob.multihash))
      assert(records.length === 1)
      assert.strictEqual(records[0].offset, offset)
      assert.strictEqual(records[0].length, length)
      assert(equals(records[0].location.digest, packCid.multihash.digest))
      assert(records[0].type === Type.BLOB)
    })
  })
}
