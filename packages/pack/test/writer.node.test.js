import * as API from '../src/api.js'

import assert from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'
import all from 'it-all'

import { CarIndexer } from '@ipld/car'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals } from 'uint8arrays/equals'
import { base58btc } from 'multiformats/bases/base58'

import { MultipleLevelIndex } from '@hash-stream/index'
import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'
import { Type as IndexRecordType } from '@hash-stream/index/record'

import { PackWriter } from '../src/writer.js'
import { FSPackStore } from '../src/store/fs.js'

import { randomBytes } from './helpers/random.js'

describe('write pack in FSPackStore', () => {
  /** @type {string} */
  let tempDir
  /** @type {FSPackStore} */
  let store
  /** @type {PackWriter} */
  let writer

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-pack-test-'))
    store = new FSPackStore(tempDir)
    writer = new PackWriter(store)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should write sharded packs from a blob', async () => {
    const byteLength = 50_000_000
    const chunkSize = byteLength / 5
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const createPackOptions = {
      shardSize: chunkSize,
      type: /** @type {'car'} */ ('car'),
    }

    const { containingMultihash, packsMultihashes } = await writer.write(
      blob,
      createPackOptions
    )

    assert(packsMultihashes.length > 1)
    assert(containingMultihash)

    // Get packs from store and verify its bytes to hash
    for (const multihash of packsMultihashes) {
      const fetchedPackBytes = await store.get(multihash)
      assert(fetchedPackBytes)
      // Verify fetched pack bytes
      const fetchedPackDigest = await sha256.digest(fetchedPackBytes)
      assert(equals(fetchedPackDigest.bytes, multihash.bytes))
    }
  })

  it('should not be able to write non CAR packs', async () => {
    const byteLength = 50_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.CreateOptions} */
    const createPackOptions = {
      type: 'zip',
    }

    try {
      await writer.write(
        blob,
        // @ts-expect-error type is not valid
        createPackOptions
      )
      assert.fail('should have thrown')
    } catch (/** @type {any} */ err) {
      assert.strictEqual(err.message, 'only CAR packs are supported')
    }
  })
})

describe('write pack in FSPackStore and index them in a multiple-level index', () => {
  /** @type {string} */
  let tempDirPackStore
  /** @type {string} */
  let tempDirIndexStore
  /** @type {API.IndexStore} */
  let indexStore
  /** @type {import('@hash-stream/index/types').Index} */
  let index
  /** @type {FSPackStore} */
  let packStore
  /** @type {PackWriter} */
  let packWriter

  beforeEach(() => {
    // Create Index
    tempDirIndexStore = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-index-test-'))
    indexStore = new FSContainingIndexStore(tempDirIndexStore)
    index = new MultipleLevelIndex(indexStore)

    // Create Pack Writer
    tempDirPackStore = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-pack-test-'))
    packStore = new FSPackStore(tempDirPackStore)
    packWriter = new PackWriter(packStore, {
      indexWriter: index,
    })
  })

  afterEach(() => {
    if (fs.existsSync(tempDirPackStore)) {
      fs.rmSync(tempDirPackStore, { recursive: true, force: true })
    }
  })

  it('should write packs from a blob and index them without containing', async () => {
    const byteLength = 50_000_000
    const chunkSize = byteLength / 5
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @type {Map<string, API.MultihashDigest[]>} */
    const packBlobsMap = new Map()
    /** @typedef {API.PackWriterWriteOptions} */
    const createPackOptions = {
      shardSize: chunkSize,
      type: /** @type {'car'} */ ('car'),
      notIndexContaining: true,
      /**
       * @type {API.PackWriterWriteOptions['onPackWrite']}
       */
      onPackWrite: (packMultihash, blobMultihashes) => {
        const encodedPackMultihash = base58btc.encode(packMultihash.bytes)
        packBlobsMap.set(encodedPackMultihash, blobMultihashes)
      },
    }

    // Write blob with pack writer
    const { containingMultihash, packsMultihashes } = await packWriter.write(
      blob,
      createPackOptions
    )
    assert(packsMultihashes.length > 1)
    assert(containingMultihash)

    assert.strictEqual(packsMultihashes.length, packBlobsMap.size)

    // Find Records for each pack and verify they have sub-records
    for (const multihash of packsMultihashes) {
      // Should find records with containing even if not indexed that way
      const recordsWithContaining = await all(
        index.findRecords(multihash, {
          containingMultihash,
        })
      )
      assert(recordsWithContaining.length)

      // Should find records without containing
      const records = await all(index.findRecords(multihash))
      assert(records.length === 1)
      const packRecord = records[0]
      assert(packRecord)
      assert.strictEqual(packRecord.multihash.toString(), multihash.toString())
      assert.strictEqual(packRecord.location.toString(), multihash.toString())
      assert(!packRecord.offset)
      assert(!packRecord.length)
      assert.strictEqual(packRecord.type, IndexRecordType.PACK)
      assert(packRecord.subRecords.length > 0)

      // Validate the subrecords blobs content
      const packBytes = await packStore.get(multihash)
      assert(packBytes)
      const packIterable = await CarIndexer.fromBytes(packBytes)
      const packBlobs = await all(packIterable)

      // Pack multihash was reported in onPackWrite
      const encodedPackMultihash = base58btc.encode(multihash.bytes)
      const packBlobsMultihashes = packBlobsMap.get(encodedPackMultihash)
      assert(packBlobsMultihashes?.length)

      // Validate subrecords
      for (const record of packRecord.subRecords) {
        const blob = packBlobs.find((blob) =>
          equals(blob.cid.multihash.bytes, record.multihash.bytes)
        )
        assert(blob)
        const packBlobMultihashReported = packBlobsMultihashes.find((mh) =>
          equals(mh.bytes, record.multihash.bytes)
        )
        assert(packBlobMultihashReported)
        assert(record.type === IndexRecordType.BLOB)
        assert.strictEqual(blob.blockOffset, record.offset)
        assert.strictEqual(blob.blockLength, record.length)
      }
    }

    // Check if containing multihash is not indexed
    const containingRecords = await all(index.findRecords(containingMultihash))
    assert(!containingRecords.length)
  })

  it('should write packs from a blob and index them with containing', async () => {
    const byteLength = 50_000_000
    const chunkSize = byteLength / 5
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.PackWriterWriteOptions} */
    const createPackOptions = {
      shardSize: chunkSize,
      type: /** @type {'car'} */ ('car'),
    }

    const { containingMultihash, packsMultihashes } = await packWriter.write(
      blob,
      createPackOptions
    )

    assert(packsMultihashes.length > 1)
    assert(containingMultihash)

    // Get records for containing and verify it has sub-records
    const containingRecordsStream = await index.findRecords(containingMultihash)
    assert(containingRecordsStream)
    const containingRecords = await all(containingRecordsStream)
    assert(containingRecords.length === 1)
    const containingRecord = containingRecords[0]
    assert(containingRecord)
    assert.strictEqual(
      containingRecord.multihash.toString(),
      containingMultihash.toString()
    )
    assert.strictEqual(
      containingRecord.location.toString(),
      containingMultihash.toString()
    )
    assert(!containingRecord.offset)
    assert(!containingRecord.length)
    assert.strictEqual(containingRecord.type, IndexRecordType.CONTAINING)
    assert(
      containingRecord.subRecords.filter(
        (record) => record.type === IndexRecordType.PACK
      ).length === packsMultihashes.length
    )
    // Ensure every sub-record in containingRecord has a multihash in packsMultihashes
    for (const record of containingRecord.subRecords) {
      assert(
        packsMultihashes.some((mh) => equals(mh.bytes, record.multihash.bytes))
      )
    }

    // Find Records for each pack and verify they have sub-records
    for (const multihash of packsMultihashes) {
      // Should not find records without containing
      const recordsWithoutContaining = await all(index.findRecords(multihash))
      assert(!recordsWithoutContaining.length)

      // Should find records with containing
      const records = await all(
        index.findRecords(multihash, {
          containingMultihash,
        })
      )
      assert(records.length === 1)
      const packRecord = records[0]
      assert(packRecord)
      assert.strictEqual(packRecord.multihash.toString(), multihash.toString())
      assert.strictEqual(packRecord.location.toString(), multihash.toString())
      assert(!packRecord.offset)
      assert(!packRecord.length)
      assert.strictEqual(packRecord.type, IndexRecordType.PACK)
      assert(packRecord.subRecords.length > 0)
    }
  })

  it.skip('should write packs from a blob and index them with containing to reconstruct the blob', async () => {
    const byteLength = 50_000_000
    const chunkSize = byteLength / 5
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @typedef {API.PackWriterWriteOptions} */
    const createPackOptions = {
      shardSize: chunkSize,
      type: /** @type {'car'} */ ('car'),
    }

    // Write blob with pack writer
    const { containingMultihash, packsMultihashes } = await packWriter.write(
      blob,
      createPackOptions
    )
    assert(packsMultihashes.length > 1)
    assert(containingMultihash)

    const containingRecordsStream = await index.findRecords(containingMultihash)
    assert(containingRecordsStream)
    const containingRecords = await all(containingRecordsStream)
    assert(containingRecords.length === 1)
    const containingRecord = containingRecords[0]
    assert(containingRecord)

    // Reconstruct the blob from the index
    const blobRecords = getAllBlobRecords(containingRecord)

    /** @type {Map<string, Uint8Array>} */
    const packCache = new Map()
    const reconstructedBytes = new Uint8Array(byteLength)
    let writeOffset = 0
    let count = 0

    for (const blobRecord of blobRecords) {
      let packBytes = packCache.get(blobRecord.location.toString())
      if (!packBytes) {
        // @ts-ignore
        packBytes = await packStore.get(blobRecord.location)
        assert(packBytes)
        packCache.set(blobRecord.location.toString(), packBytes)
      }

      const blobBytes = packBytes.slice(
        blobRecord.offset,
        // @ts-ignore
        blobRecord.offset + blobRecord.length
      )
      reconstructedBytes.set(blobBytes, writeOffset)
      writeOffset += blobBytes.length
      count += 1
    }
  })
})

/**
 * @param {import('@hash-stream/index/types').IndexRecord} record
 * @returns {import('@hash-stream/index/types').IndexRecord[]}
 */
function getAllBlobRecords(record) {
  /** @type {import('@hash-stream/index/types').IndexRecord[]} */
  const blobRecords = []
  for (const subRecord of record.subRecords) {
    if (subRecord.type === IndexRecordType.BLOB) {
      blobRecords.push(subRecord)
    } else if (subRecord.type === IndexRecordType.PACK) {
      blobRecords.push(...getAllBlobRecords(subRecord))
    }
  }
  return blobRecords
}
