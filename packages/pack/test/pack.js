import * as API from '../src/api.js'

import assert from 'assert'
import { sha256, sha512 } from 'multiformats/hashes/sha2'
import { equals } from 'uint8arrays/equals'

import { createPacks } from '../src/index.js'

import { randomBytes } from './helpers/random.js'

/**
 * @typedef {import('@hash-stream/pack/types').PackStore} PackStore
 *
 * @typedef {object} Destroyable
 * @property {() => void} destroy
 *
 * @typedef {PackStore & Destroyable} DestroyablePackStore
 */

/**
 * Runs the test suite for packs.
 *
 * @param {string} storeName - The name of the store (e.g., "Memory", "FS").
 * @param {() => DestroyablePackStore} createPackStore - Function to create the pack store.
 */
export function runPackTests(storeName, createPackStore) {
  describe('pack', () => {
    describe('generate packs', () => {
      it('should generate CAR pack from a blob', async () => {
        const byteLength = 100_000_000
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @typedef {API.CreateOptions} */
        const createPackOptions = {
          type: /** @type {'car'} */ ('car'),
        }

        const carPacks = []
        const { packStream, containingPromise } = createPacks(
          blob,
          createPackOptions
        )
        for await (const pack of packStream) {
          carPacks.push(pack)
          assert(pack.bytes)
          assert(pack.multihash)
          assert(pack.multihash.code === sha256.code)
        }

        assert(carPacks.length === 1)
        assert.ok(await containingPromise)
      })

      it('should generate sharded CAR packs from a blob', async () => {
        const byteLength = 100_000_000
        const shardSize = byteLength / 10
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @typedef {API.CreateOptions} */
        const createPackOptions = {
          shardSize,
          type: /** @type {'car'} */ ('car'),
        }

        const carPacks = []
        const { packStream, containingPromise } = createPacks(
          blob,
          createPackOptions
        )
        for await (const pack of packStream) {
          carPacks.push(pack)
          assert(pack.bytes)
          assert(pack.multihash)
          assert(pack.multihash.code === sha256.code)
          assert(pack.bytes.byteLength < shardSize)
        }

        assert(carPacks.length > 1)
        assert.ok(await containingPromise)
      })

      it('should fail to generate non-CAR packs', async () => {
        const byteLength = 100_000_000
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @typedef {API.CreateOptions} */
        const createPackOptions = {
          type: /** @type {'dag'} */ ('dag'),
        }

        try {
          // @ts-expect-error type is wrong
          createPacks(blob, createPackOptions)
          assert.fail('should have thrown')
        } catch (/** @type {any} */ err) {
          assert.strictEqual(err.message, 'only CAR packs are supported')
        }
      })

      it('should generate CAR packs with custom hasher', async () => {
        const byteLength = 100_000_000
        const shardSize = byteLength / 10
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @typedef {API.CreateOptions} */
        const createPackOptions = {
          shardSize,
          type: /** @type {'car'} */ ('car'),
          hasher: sha512,
        }

        const carPacks = []
        const { packStream, containingPromise } = createPacks(
          blob,
          createPackOptions
        )
        for await (const pack of packStream) {
          carPacks.push(pack)
          assert(pack.bytes)
          assert(pack.multihash)
          assert(pack.multihash.code === sha512.code)
        }

        assert(carPacks.length > 1)
        assert.ok(await containingPromise)
      })
    })

    describe(`create and store pack with ${storeName} Store`, () => {
      /** @type {DestroyablePackStore} */
      let store

      beforeEach(() => {
        store = createPackStore()
      })

      afterEach(() => {
        store.destroy()
      })

      it('should create sharded packs from a blob and validate storage', async () => {
        const byteLength = 50_000_000
        const chunkSize = byteLength / 5
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @typedef {API.CreateOptions} */
        const createOptions = {
          shardSize: chunkSize,
          type: /** @type {'car'} */ ('car'),
        }

        const { packStream, containingPromise } = createPacks(
          blob,
          createOptions
        )

        const storedPacks = []
        for await (const pack of packStream) {
          storedPacks.push(pack)
          await store.put(pack.multihash, pack.bytes)
        }

        assert(storedPacks.length > 1)
        const containingMultihash = await containingPromise
        assert(containingMultihash)

        // Get packs from store and verify its bytes to hash
        for (const pack of storedPacks) {
          const fetchedPackBytes = await store.get(pack.multihash)
          assert(fetchedPackBytes)
          // Verify fetched pack bytes
          assert(equals(fetchedPackBytes, pack.bytes))
          // Verify hash matches
          const fetchedPackDigest = await sha256.digest(fetchedPackBytes)
          assert(equals(fetchedPackDigest.bytes, pack.multihash.bytes))
        }
      })

      it('should not be able to get non stored pack', async () => {
        const bytes = await randomBytes(600)
        const multihash = await sha256.digest(bytes)
        const fetchedPackBytes = await store.get(multihash)
        assert.strictEqual(fetchedPackBytes, null)
      })
    })
  })
}
