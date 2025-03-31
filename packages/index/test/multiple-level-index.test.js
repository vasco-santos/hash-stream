import * as API from '../src/api.js'
import assert from 'assert'
import { CarIndexer, CarBlockIterator } from '@ipld/car'
import { fromShardArchives } from '@web3-storage/blob-index/util'
import { equals } from 'uint8arrays'
import all from 'it-all'

import { MemoryContainingIndexStore } from '../src/store/memory-containing.js'
import { IndexReader } from '../src/reader.js'
import { MultipleLevelIndexWriter } from '../src/writer/multiple-level.js'
import { Type } from '../src/record.js'
import { carBlockIndexToBlobIndexRecordIterable } from '../src/utils.js'

import { randomCID, randomCAR } from './helpers/random.js'

describe('MultipleLevelIndex', () => {
  /** @type {MemoryContainingIndexStore} */
  let store
  /** @type {API.IndexReader} */
  let indexReader
  /** @type {API.IndexWriter} */
  let indexWriter

  beforeEach(() => {
    store = new MemoryContainingIndexStore()
    indexReader = new IndexReader(store)
    indexWriter = new MultipleLevelIndexWriter(store)
  })

  it('returns no records for unknown multihash', async () => {
    const multihash = (await randomCID()).multihash
    const records = await all(indexReader.findRecords(multihash))
    assert.deepEqual(records, [])
  })

  it('returns no records for unknown containing multihash', async () => {
    const multihash = (await randomCID()).multihash
    const containingMultihash = (await randomCID()).multihash
    const records = await all(
      indexReader.findRecords(multihash, {
        containingMultihash,
      })
    )
    assert.deepEqual(records, [])
  })

  it('adds blobs packed and associated with a containing record', async () => {
    const containing = await randomCID()
    const blobLength = 4
    const packCid = await randomCID()
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: packCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })(),
      { containingMultihash: containing.multihash }
    )

    const entries = await all(store.get(containing.multihash))
    assert(entries.length)
  })

  it('adds blobs not packed and associated with a containing record', async () => {
    const containing = await randomCID()
    const blobLength = 4
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: blobCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })(),
      { containingMultihash: containing.multihash }
    )

    const entries = await all(store.get(containing.multihash))
    assert(entries.length)
  })

  it('adds blobs non packed and not associated with a containing record', async () => {
    const blobLength = 4
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: blobCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })()
    )

    for (const blobCid of blobCids) {
      const records = await all(store.get(blobCid.multihash))
      assert(records.length === 1)
    }
  })

  it('adds blobs packed and not associated with a containing record', async () => {
    const blobLength = 4
    const packCid = await randomCID()
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: packCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })()
    )

    const packRecords = await all(store.get(packCid.multihash))
    assert(packRecords.length === 1)
    assert(equals(packRecords[0].multihash.bytes, packCid.multihash.bytes))
    assert(equals(packRecords[0].location.bytes, packCid.multihash.bytes))
    assert(!packRecords[0].offset)
    assert(!packRecords[0].length)
    assert.strictEqual(packRecords[0].type, Type.PACK)
    assert.strictEqual(packRecords[0].subRecords.length, blobLength)
  })

  it('finds records for existing containing record', async () => {
    const containing = await randomCID()
    const blobLength = 4
    const packCid = await randomCID()
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: packCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })(),
      { containingMultihash: containing.multihash }
    )

    const records = await all(indexReader.findRecords(containing.multihash))
    assert(records.length === 1)
    assert(equals(records[0].multihash.bytes, containing.multihash.bytes))
    assert(equals(records[0].location.bytes, containing.multihash.bytes))
    assert(!records[0].offset)
    assert(!records[0].length)
    assert.strictEqual(records[0].type, Type.CONTAINING)

    const packRecord = records[0].subRecords.find((record) =>
      equals(record.multihash.bytes, packCid.multihash.bytes)
    )
    assert(packRecord)
    assert.strictEqual(packRecord.type, Type.PACK)
    assert.strictEqual(packRecord.subRecords.length, blobLength)
    for (const blobCid of blobCids) {
      // @ts-ignore type not inferred
      const blobRecord = packRecord.subRecords.find((record) =>
        equals(record.multihash.bytes, blobCid.multihash.bytes)
      )
      assert(blobRecord)
      assert.strictEqual(blobRecord.type, Type.BLOB)
    }
  })

  it('finds records for existing blob record when containing is provided', async () => {
    const containing = await randomCID()
    const blobLength = 4
    const packCid = await randomCID()
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: packCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })(),
      { containingMultihash: containing.multihash }
    )

    for (const blobCid of blobCids) {
      const recordsWithoutContaining = await all(
        indexReader.findRecords(blobCid.multihash)
      )
      assert.deepEqual(recordsWithoutContaining, [])

      const records = await all(
        indexReader.findRecords(blobCid.multihash, {
          containingMultihash: containing.multihash,
        })
      )
      assert(records.length === 1)
      assert(equals(records[0].multihash.bytes, blobCid.multihash.bytes))
      assert(equals(records[0].location.bytes, packCid.multihash.bytes))
      assert.strictEqual(records[0].offset, 0)
      assert.strictEqual(records[0].length, 100)
      assert.strictEqual(records[0].type, Type.BLOB)
    }
  })

  it('finds records for existing pack record when containing is provided', async () => {
    const containing = await randomCID()
    const blobLength = 4
    const packCid = await randomCID()
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: packCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })(),
      { containingMultihash: containing.multihash }
    )
    const recordsWithoutContaining = await all(
      indexReader.findRecords(packCid.multihash)
    )
    assert(recordsWithoutContaining.length === 0)

    const records = await all(
      indexReader.findRecords(packCid.multihash, {
        containingMultihash: containing.multihash,
      })
    )
    assert(records.length === 1)

    assert(records[0])
    assert(equals(records[0].multihash.bytes, packCid.multihash.bytes))
    assert(equals(records[0].location.bytes, packCid.multihash.bytes))
    assert.strictEqual(records[0].type, Type.PACK)
    assert.strictEqual(records[0].subRecords.length, blobLength)
    for (const blobCid of blobCids) {
      // @ts-ignore type not inferred
      const blobRecord = records[0].subRecords.find((record) =>
        equals(record.multihash.bytes, blobCid.multihash.bytes)
      )
      assert(blobRecord)
      assert.strictEqual(blobRecord.type, Type.BLOB)
    }
  })

  it('finds records for existing non packed blob record when containing is provided', async () => {
    const containing = await randomCID()
    const blobLength = 4
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: blobCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })(),
      { containingMultihash: containing.multihash }
    )

    const records = await all(indexReader.findRecords(containing.multihash))
    assert(records.length === 1)
    assert(equals(records[0].multihash.bytes, containing.multihash.bytes))
    assert(equals(records[0].location.bytes, containing.multihash.bytes))
    assert(!records[0].offset)
    assert(!records[0].length)
    assert.strictEqual(records[0].type, Type.CONTAINING)
    assert.strictEqual(records[0].subRecords.length, blobLength)

    for (const blobCid of blobCids) {
      const recordsWithoutContaining = await all(
        indexReader.findRecords(blobCid.multihash)
      )
      assert.deepEqual(recordsWithoutContaining, [])

      const records = await all(
        indexReader.findRecords(blobCid.multihash, {
          containingMultihash: containing.multihash,
        })
      )
      assert(records.length === 1)
      assert(equals(records[0].multihash.bytes, blobCid.multihash.bytes))
      assert(equals(records[0].location.bytes, blobCid.multihash.bytes))
      assert.strictEqual(records[0].offset, 0)
      assert.strictEqual(records[0].length, 100)
      assert.strictEqual(records[0].type, Type.BLOB)
    }
  })

  it('adds multiple packs under the same containing multihash and find records', async () => {
    const cars = await Promise.all([
      randomCAR(4100, { chunkSize: 2000 }),
      randomCAR(1000),
    ])

    const containingCid = cars[0].roots[0]
    if (!containingCid) throw new Error('No root CID found')

    // Add blobs from CARs to the index under the same containing multihash
    await Promise.all(
      cars.map(async (car) => {
        const carBytes = new Uint8Array(await car.arrayBuffer())
        const blockIterable = await CarIndexer.fromBytes(carBytes)
        await indexWriter.addBlobs(
          carBlockIndexToBlobIndexRecordIterable(blockIterable, car.cid),
          {
            containingMultihash: containingCid.multihash,
          }
        )
      })
    )

    // Get packs for the containing CID
    const containingStream = await indexReader.findRecords(
      containingCid.multihash
    )

    assert(containingStream)
    const records = await all(containingStream)
    assert(records.length === 1)

    assert(equals(records[0].multihash.bytes, containingCid.multihash.bytes))
    assert(equals(records[0].location.bytes, containingCid.multihash.bytes))
    assert(!records[0].offset)
    assert(!records[0].length)
    assert.strictEqual(records[0].type, Type.CONTAINING)

    assert.strictEqual(records[0].subRecords.length, cars.length)
    for (const car of cars) {
      const packRecord = records[0].subRecords.find((record) =>
        equals(record.multihash.bytes, car.cid.multihash.bytes)
      )
      assert(packRecord)
      assert.strictEqual(packRecord.type, Type.PACK)

      const carBytes = new Uint8Array(await car.arrayBuffer())
      const blockIterator = await CarBlockIterator.fromBytes(carBytes)
      for await (const block of blockIterator) {
        // @ts-ignore type not inferred
        const blobRecord = packRecord.subRecords.find((record) =>
          equals(record.multihash.bytes, block.cid.multihash.bytes)
        )
        assert(blobRecord)
        assert.strictEqual(blobRecord.type, Type.BLOB)
      }
    }
  })

  it('finds blobs not associated with a containing record as fallback when containing is still given', async () => {
    const containing = await randomCID()
    const blobLength = 4
    // Add some blobs containing by a multihash
    const containingBlobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )
    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of containingBlobCids) {
          yield {
            multihash: blobCid.multihash,
            location: blobCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })(),
      { containingMultihash: containing.multihash }
    )

    // Add some flat blobs not containing by a CID
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )
    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: blobCid.multihash,
            offset: 0,
            length: 100,
          }
        }
      })()
    )

    for (const blobCid of blobCids) {
      const records = await all(
        indexReader.findRecords(blobCid.multihash, {
          containingMultihash: containing.multihash,
        })
      )
      assert(records.length === 1)
    }
  })

  it('can create valid indexes for blobs', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const root = await randomCID()
    if (!root) throw new Error('No root CID found')

    const carBytes = new Uint8Array(await car.arrayBuffer())
    const blockIterable = await CarIndexer.fromBytes(carBytes)

    await indexWriter.addBlobs(
      carBlockIndexToBlobIndexRecordIterable(blockIterable, car.cid),
      {
        containingMultihash: root.multihash,
      }
    )

    // Create an index with other library to compare results
    const index = await fromShardArchives(root, [carBytes])
    for (const [shardDigest, slices] of index.shards.entries()) {
      for (const [blobDigest, position] of slices.entries()) {
        const recordsStream = await indexReader.findRecords(blobDigest, {
          containingMultihash: root.multihash,
        })

        assert(recordsStream)
        const records = await all(recordsStream)
        assert(records.length === 1)
        assert(equals(records[0].location.digest, shardDigest.digest))
        assert.strictEqual(records[0].offset, position[0])
        assert.strictEqual(records[0].length, position[1])
        assert(records[0].type === Type.BLOB)
      }
    }
  })
})
