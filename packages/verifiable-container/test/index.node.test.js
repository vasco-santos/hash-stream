import * as API from '../src/api.js'

import assert from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'

import { sha256 } from 'multiformats/hashes/sha2'
import { equals } from 'uint8arrays/equals'

import { create, createAndStore } from '../src/index.js'
import { FSContainerStore } from '../src/store/fs.js'

import { randomBytes } from './helpers/random.js'

export const CarCode = 0x0202

describe('create and store verifiable container with FSContainerStore', () => {
  /** @type {FSContainerStore} */
  let store
  /** @type {string} */
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-block-test-'))
    store = new FSContainerStore(tempDir)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should create and store sharded verifiable containers from a blob', async () => {
    const byteLength = 50_000_000
    const chunkSize = byteLength / 5
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiableContainerOptions = {
      shardSize: chunkSize,
      type: /** @type {'car'} */ ('car'),
    }

    const { rootCid, containersMultihash } = await createAndStore(
      blob,
      store,
      verifiableContainerOptions
    )

    assert(containersMultihash.length > 1)
    assert(rootCid)

    // Get containers from store and verify its bytes to hash
    for (const multihash of containersMultihash) {
      const fetchedContainerBytes = await store.get(multihash)
      assert(fetchedContainerBytes)
      // Verify fetched container bytes
      const fetchedContainerDigest = await sha256.digest(fetchedContainerBytes)
      assert(equals(fetchedContainerDigest.bytes, multihash.bytes))
    }
  })

  it('should not be able to create and store non CAR containers', async () => {
    const byteLength = 50_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiableContainerOptions = {
      type: 'zip',
    }

    try {
      await createAndStore(
        blob,
        store,
        // @ts-expect-error type is not valid
        verifiableContainerOptions
      )
      assert.fail('should have thrown')
    } catch (/** @type {any} */ err) {
      assert.strictEqual(err.message, 'only CAR containers are supported')
    }
  })

  it('should create sharded verifiable containers from a blob and validate storage', async () => {
    const byteLength = 50_000_000
    const chunkSize = byteLength / 5
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiableContainerOptions = {
      shardSize: chunkSize,
      type: /** @type {'car'} */ ('car'),
    }

    const { stream: generateCarContainers, root } = create(
      blob,
      verifiableContainerOptions
    )

    const storedContainers = []
    for await (const container of generateCarContainers) {
      storedContainers.push(container)
      await store.put(container.multihash, container.bytes)
    }

    assert(storedContainers.length > 1)
    const rootCid = await root
    assert(rootCid)

    // Get containers from store and verify its bytes to hash
    for (const container of storedContainers) {
      const fetchedContainerBytes = await store.get(container.multihash)
      assert(fetchedContainerBytes)
      // Verify fetched container bytes
      assert(equals(fetchedContainerBytes, container.bytes))
      // Verify hash matches
      const fetchedContainerDigest = await sha256.digest(fetchedContainerBytes)
      assert(equals(fetchedContainerDigest.bytes, container.multihash.bytes))
    }
  })

  it('should not be able to get non stored container', async () => {
    const bytes = await randomBytes(600)
    const multihash = await sha256.digest(bytes)
    const fetchedContainerBytes = await store.get(multihash)
    assert.strictEqual(fetchedContainerBytes, null)
  })
})
