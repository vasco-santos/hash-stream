import * as API from '../src/api.js'

import assert from 'assert'
import { sha256, sha512 } from 'multiformats/hashes/sha2'

import { createPacks } from '../src/index.js'

import { randomBytes } from './helpers/random.js'

export const CarCode = 0x0202

describe('generate verifiable packs', () => {
  it('should generate CAR pack from a blob', async () => {
    const byteLength = 100_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiablePackOptions = {
      type: /** @type {'car'} */ ('car'),
    }

    const carPacks = []
    const { packStream, containingPromise } = createPacks(
      blob,
      verifiablePackOptions
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
    const verifiablePackOptions = {
      shardSize,
      type: /** @type {'car'} */ ('car'),
    }

    const carPacks = []
    const { packStream, containingPromise } = createPacks(
      blob,
      verifiablePackOptions
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
    const verifiablePackOptions = {
      type: /** @type {'dag'} */ ('dag'),
    }

    try {
      // @ts-expect-error type is wrong
      createPacks(blob, verifiablePackOptions)
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
    const verifiablePackOptions = {
      shardSize,
      type: /** @type {'car'} */ ('car'),
      hasher: sha512,
    }

    const carPacks = []
    const { packStream, containingPromise } = createPacks(
      blob,
      verifiablePackOptions
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
