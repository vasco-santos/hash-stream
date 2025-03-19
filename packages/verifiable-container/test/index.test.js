import * as API from '../src/api.js'

import assert from 'assert'
import { sha256, sha512 } from 'multiformats/hashes/sha2'

import { create } from '../src/index.js'

import { randomBytes } from './helpers/random.js'

export const CarCode = 0x0202

describe('generate verifiable containers', () => {
  it('should generate CAR container from a blob', async () => {
    const byteLength = 100_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiableContainerOptions = {
      type: /** @type {'car'} */ ('car'),
    }

    const carContainers = []
    const { stream: generateCarContainers, root } = create(
      blob,
      verifiableContainerOptions
    )
    for await (const container of generateCarContainers) {
      carContainers.push(container)
      assert(container.car)
      assert(container.multihash)
      assert(container.multihash.code === sha256.code)
    }

    assert(carContainers.length === 1)
    assert(await root)
  })

  it('should generate sharded CAR containers from a blob', async () => {
    const byteLength = 100_000_000
    const shardSize = byteLength / 10
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiableContainerOptions = {
      shardSize,
      type: /** @type {'car'} */ ('car'),
    }

    const carContainers = []
    const { stream: generateCarContainers, root } = create(
      blob,
      verifiableContainerOptions
    )
    for await (const container of generateCarContainers) {
      carContainers.push(container)
      assert(container.car)
      assert(container.multihash)
      assert(container.multihash.code === sha256.code)
      assert(container.car.size < shardSize)
    }

    assert(carContainers.length > 1)
    assert(await root)
  })

  it('should fail to generate non-CAR containers', async () => {
    const byteLength = 100_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiableContainerOptions = {
      type: /** @type {'dag'} */ ('dag'),
    }

    try {
      // @ts-expect-error type is wrong
      create(blob, verifiableContainerOptions)
      assert.fail('should have thrown')
    } catch (/** @type {any} */ err) {
      assert.strictEqual(err.message, 'only CAR containers are supported')
    }
  })

  it('should generate CAR containers with custom hasher', async () => {
    const byteLength = 100_000_000
    const shardSize = byteLength / 10
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiableContainerOptions = {
      shardSize,
      type: /** @type {'car'} */ ('car'),
      hasher: sha512,
    }

    const carContainers = []
    const { stream: generateCarContainers, root } = create(
      blob,
      verifiableContainerOptions
    )
    for await (const container of generateCarContainers) {
      carContainers.push(container)
      assert(container.car)
      assert(container.multihash)
      assert(container.multihash.code === sha512.code)
    }

    assert(carContainers.length > 1)
    assert(await root)
  })
})
