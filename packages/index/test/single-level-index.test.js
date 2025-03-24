import assert from 'assert'

import { CarIndexer, CarBlockIterator } from '@ipld/car'
import { fromShardArchives } from '@web3-storage/blob-index/util'
import { equals } from 'uint8arrays'
import all from 'it-all'

import { SingleLevelIndex } from '../src/single-level-index.js'
import { MemoryBlobIndexStore } from '../src/store/memory-blob.js'
import { Type, createFromBlob } from '../src/record.js'
import { carBlockIndexToBlobIndexRecordIterable } from '../src/utils.js'

import { randomCID, randomCAR } from './helpers/random.js'

describe('SingleLevelIndex', () => {
  /** @type {MemoryBlobIndexStore} */
  let store
  /** @type {SingleLevelIndex} */
  let singleLevelIndex

  beforeEach(() => {
    store = new MemoryBlobIndexStore()
    singleLevelIndex = new SingleLevelIndex(store)
  })

  it('can find the location of a stored blob', async () => {
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
    const recordsStream = await singleLevelIndex.findRecords(blobCid.multihash)
    assert(recordsStream)

    const records = await all(recordsStream)
    assert(records.length === 1)
    assert.strictEqual(records[0].offset, offset)
    assert.strictEqual(records[0].length, length)
    assert(equals(records[0].location.digest, packCid.multihash.digest))
    assert(records[0].type === Type.BLOB)
  })

  it('returns null for non-existent blob index records', async () => {
    const blobCid = await randomCID()
    const records = await singleLevelIndex.findRecords(blobCid.multihash)
    assert.strictEqual(records, null)
  })

  it('can handle large offsets and lengths in blob locations', async () => {
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
    const recordsStream = await singleLevelIndex.findRecords(blobCid.multihash)
    assert(recordsStream)

    const records = await all(recordsStream)

    assert(records.length === 1)
    assert.strictEqual(records[0].offset, offset)
    assert.strictEqual(records[0].length, length)
    assert(equals(records[0].location.digest, packCid.multihash.digest))
    assert(records[0].type === Type.BLOB)
  })

  it('can add a pack and find records', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const root = car.roots[0]
    if (!root) throw new Error('No root CID found')

    const carBytes = new Uint8Array(await car.arrayBuffer())
    const carIndexer = await CarIndexer.fromBytes(carBytes)

    await singleLevelIndex.addBlobs(
      carBlockIndexToBlobIndexRecordIterable(carIndexer, car.cid)
    )

    // Create blob iterator and verify all blobs were indexed
    const blobIterator = await CarBlockIterator.fromBytes(carBytes)
    let blobCount = 0
    for await (const blob of blobIterator) {
      const recordsStream = await singleLevelIndex.findRecords(
        blob.cid.multihash
      )
      assert(recordsStream)
      const records = await all(recordsStream)
      assert(records.length === 1)
      assert(equals(records[0].location.digest, car.cid.multihash.digest))
      assert(records[0].offset)
      assert(records[0].length)
      assert(records[0].type === Type.BLOB)

      blobCount++
    }
  })

  it('can create valid indexes for blobs', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const root = car.roots[0]
    if (!root) throw new Error('No root CID found')

    const carBytes = new Uint8Array(await car.arrayBuffer())
    const carIndexer = await CarIndexer.fromBytes(carBytes)

    await singleLevelIndex.addBlobs(
      carBlockIndexToBlobIndexRecordIterable(carIndexer, car.cid)
    )

    // Create an index with other library to compare results
    const index = await fromShardArchives(root, [carBytes])
    for (const [shardDigest, slices] of index.shards.entries()) {
      assert(equals(shardDigest.digest, car.cid.multihash.digest))

      for (const [blobDigest, position] of slices.entries()) {
        const recordsStream = await singleLevelIndex.findRecords(blobDigest)

        assert(recordsStream)
        const records = await all(recordsStream)
        assert(records.length === 1)
        assert(equals(records[0].location.digest, car.cid.multihash.digest))
        assert.strictEqual(records[0].offset, position[0])
        assert.strictEqual(records[0].length, position[1])
        assert(records[0].type === Type.BLOB)
      }
    }
  })
})
