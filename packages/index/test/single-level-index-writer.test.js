import * as API from '../src/api.js'
import assert from 'assert'

import { CarIndexer, CarBlockIterator } from '@ipld/car'
import { fromShardArchives } from '@web3-storage/blob-index/util'
import { equals } from 'uint8arrays'
import all from 'it-all'

import { IndexReader } from '../src/reader.js'
import { SingleLevelIndexWriter } from '../src/writer/single-level.js'
import { MemoryIndexStore } from '../src/store/memory.js'
import { Type } from '../src/record.js'
import { carBlockIndexToBlobIndexRecordIterable } from '../src/utils.js'

import { randomCAR, randomCID } from './helpers/random.js'

describe('SingleLevelIndex Writer', () => {
  /** @type {MemoryIndexStore} */
  let store
  /** @type {API.IndexReader} */
  let indexReader
  /** @type {API.IndexWriter} */
  let indexWriter

  beforeEach(() => {
    store = new MemoryIndexStore()
    indexReader = new IndexReader(store)
    indexWriter = new SingleLevelIndexWriter(store)
  })

  it('can add a pack and find records', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const root = car.roots[0]
    if (!root) throw new Error('No root CID found')

    const carBytes = new Uint8Array(await car.arrayBuffer())
    const carIndexer = await CarIndexer.fromBytes(carBytes)

    await indexWriter.addBlobs(
      carBlockIndexToBlobIndexRecordIterable(carIndexer, car.cid)
    )

    // Create blob iterator and verify all blobs were indexed
    const blobIterator = await CarBlockIterator.fromBytes(carBytes)
    let blobCount = 0
    for await (const blob of blobIterator) {
      const records = await all(indexReader.findRecords(blob.cid.multihash))
      assert(records.length === 1)
      assert(typeof records[0].location !== 'string')
      assert(equals(records[0].location.digest, car.cid.multihash.digest))
      assert(records[0].offset)
      assert(records[0].length)
      assert(records[0].type === Type.BLOB)

      blobCount++
    }
  })

  it('can add blobs with a path and find records', async () => {
    const blobLength = 4
    const path = '/path/to/blob'
    const blobCids = await Promise.all(
      Array.from({ length: blobLength }, async () => await randomCID())
    )

    await indexWriter.addBlobs(
      (async function* () {
        for (const blobCid of blobCids) {
          yield {
            multihash: blobCid.multihash,
            location: path,
            offset: 0,
            length: 100,
          }
        }
      })()
    )

    for (const blobCid of blobCids) {
      const records = await all(indexReader.findRecords(blobCid.multihash))
      assert(records.length === 1)
      assert(equals(records[0].multihash.bytes, blobCid.multihash.bytes))
      assert(typeof records[0].location === 'string')
      assert.strictEqual(records[0].location, path)
      assert.strictEqual(records[0].offset, 0)
      assert.strictEqual(records[0].length, 100)
      assert.strictEqual(records[0].type, Type.BLOB)
    }
  })

  it('can create valid indexes for blobs', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const root = car.roots[0]
    if (!root) throw new Error('No root CID found')

    const carBytes = new Uint8Array(await car.arrayBuffer())
    const carIndexer = await CarIndexer.fromBytes(carBytes)

    await indexWriter.addBlobs(
      carBlockIndexToBlobIndexRecordIterable(carIndexer, car.cid)
    )

    // Create an index with other library to compare results
    const index = await fromShardArchives(root, [carBytes])
    for (const [shardDigest, slices] of index.shards.entries()) {
      assert(equals(shardDigest.digest, car.cid.multihash.digest))

      for (const [blobDigest, position] of slices.entries()) {
        const records = await all(indexReader.findRecords(blobDigest))
        assert(records.length === 1)
        assert(typeof records[0].location !== 'string')
        assert(equals(records[0].location.digest, car.cid.multihash.digest))
        assert.strictEqual(records[0].offset, position[0])
        assert.strictEqual(records[0].length, position[1])
        assert(records[0].type === Type.BLOB)
      }
    }
  })
})
