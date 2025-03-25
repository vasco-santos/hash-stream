import assert from 'assert'

import { equals } from 'uint8arrays'
import all from 'it-all'

import { MemoryBlobIndexStore } from '../../src/store/memory-blob.js'
import { Type, createFromBlob } from '../../src/record.js'

import { randomCID } from '../helpers/random.js'

describe('MemoryBlobIndexStore', () => {
  /** @type {MemoryBlobIndexStore} */
  let store

  beforeEach(() => {
    store = new MemoryBlobIndexStore()
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

    const recordsStream = await store.get(blob.multihash)
    assert(recordsStream)
    const records = await all(recordsStream)
    assert(records.length === 1)
    assert.strictEqual(records[0].offset, offset)
    assert.strictEqual(records[0].length, length)
    assert(equals(records[0].location.digest, packCid.multihash.digest))
    assert(records[0].type === Type.BLOB)
  })

  it('returns null for non-existent entries', async () => {
    const blockCid = await randomCID()
    const retrieved = await store.get(blockCid.multihash)
    assert.strictEqual(retrieved, null)
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
    const recordsStream = await store.get(blob.multihash)
    assert(recordsStream)
    const records = await all(recordsStream)
    assert(records.length === 1)
    assert.strictEqual(records[0].offset, offset)
    assert.strictEqual(records[0].length, length)
    assert(equals(records[0].location.digest, packCid.multihash.digest))
    assert(records[0].type === Type.BLOB)
  })
})
