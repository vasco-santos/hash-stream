import * as API from '../src/api.js'

import assert from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'

import { sha256 } from 'multiformats/hashes/sha2'
import { equals } from 'uint8arrays/equals'

import { createPacks } from '../src/index.js'
import { FSPackStore } from '../src/store/fs.js'

import { randomBytes } from './helpers/random.js'

export const CarCode = 0x0202

describe('create and store verifiable pack with FSPackStore', () => {
  /** @type {FSPackStore} */
  let store
  /** @type {string} */
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-pack-test-'))
    store = new FSPackStore(tempDir)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should create sharded verifiable packs from a blob and validate storage', async () => {
    const byteLength = 50_000_000
    const chunkSize = byteLength / 5
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const verifiablePackOptions = {
      shardSize: chunkSize,
      type: /** @type {'car'} */ ('car'),
    }

    const { packStream, containingPromise } = createPacks(
      blob,
      verifiablePackOptions
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
