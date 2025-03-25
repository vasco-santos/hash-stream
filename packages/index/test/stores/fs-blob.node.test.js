import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'

import { equals } from 'uint8arrays'
import all from 'it-all'

import { FSBlobIndexStore } from '../../src/store/fs-blob.js'
import { Type, createFromBlob } from '../../src/record.js'

import { randomCID } from '../helpers/random.js'

describe('FSBlobIndexStore', () => {
  /** @type {FSBlobIndexStore} */
  let store
  /** @type {string} */
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-blob-test-'))
    store = new FSBlobIndexStore(tempDir)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
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

    const recordsStream = await store.get(blob.multihash)
    assert(recordsStream)
    const records = await all(recordsStream)
    assert(records.length === 1)
  })

  it('returns null for non-existent entries', async () => {
    const blobCid = await randomCID()
    const retrieved = await store.get(blobCid.multihash)
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
