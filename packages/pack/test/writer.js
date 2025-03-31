import * as API from '../src/api.js'

import assert from 'assert'
import all from 'it-all'

import { CarIndexer } from '@ipld/car'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals } from 'uint8arrays/equals'
import { base58btc } from 'multiformats/bases/base58'

import { IndexReader } from '@hash-stream/index/reader'
import { MultipleLevelIndexWriter } from '@hash-stream/index/writer/multiple-level'
import { Type as IndexRecordType } from '@hash-stream/index/record'

import { PackWriter } from '../src/writer.js'

import { randomBytes } from './helpers/random.js'

/**
 * @typedef {import('@hash-stream/pack/types').PackStore} PackStore
 * @typedef {import('@hash-stream/index/types').IndexStore} IndexStore
 *
 * @typedef {object} Destroyable
 * @property {() => void} destroy
 *
 * @typedef {PackStore & Destroyable} DestroyablePackStore
 * @typedef {IndexStore & Destroyable} DestroyableIndexStore
 */

/**
 * Runs the test suite for Pack Writer.
 *
 * @param {string} storeName - The name of the store (e.g., "Memory", "FS").
 * @param {() => DestroyablePackStore} createPackStore - Function to create the pack store.
 * @param {() => DestroyableIndexStore} createIndexStore - Function to create the index store.
 */
export function runPackWriterTests(
  storeName,
  createPackStore,
  createIndexStore
) {
  describe('writer', () => {
    describe(`write pack in ${storeName} store`, () => {
      /** @type {DestroyablePackStore} */
      let store
      /** @type {PackWriter} */
      let writer

      beforeEach(() => {
        store = createPackStore()
        writer = new PackWriter(store)
      })

      afterEach(() => {
        store.destroy()
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

    describe(`write pack in ${storeName} store and index them in a multiple-level index`, () => {
      /** @type {DestroyableIndexStore} */
      let indexStore
      /** @type {import('@hash-stream/index/types').IndexReader} */
      let indexReader
      /** @type {import('@hash-stream/index/types').IndexWriter} */
      let indexWriter
      /** @type {DestroyablePackStore} */
      let packStore
      /** @type {PackWriter} */
      let packWriter

      beforeEach(() => {
        // Create Index
        indexStore = createIndexStore()
        indexReader = new IndexReader(indexStore)
        indexWriter = new MultipleLevelIndexWriter(indexStore)

        // Create Pack Writer
        packStore = createPackStore()
        packWriter = new PackWriter(packStore, {
          indexWriter,
        })
      })

      afterEach(() => {
        indexStore.destroy()
        packStore.destroy()
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
        const { containingMultihash, packsMultihashes } =
          await packWriter.write(blob, createPackOptions)
        assert(packsMultihashes.length > 1)
        assert(containingMultihash)

        assert.strictEqual(packsMultihashes.length, packBlobsMap.size)

        // Find Records for each pack and verify they have sub-records
        for (const multihash of packsMultihashes) {
          // Should find records with containing even if not indexed that way
          const recordsWithContaining = await all(
            indexReader.findRecords(multihash, {
              containingMultihash,
            })
          )
          assert(recordsWithContaining.length)

          // Should find records without containing
          const records = await all(indexReader.findRecords(multihash))
          assert(records.length === 1)
          const packRecord = records[0]
          assert(packRecord)
          assert.strictEqual(
            packRecord.multihash.toString(),
            multihash.toString()
          )
          assert.strictEqual(
            packRecord.location.toString(),
            multihash.toString()
          )
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
        const containingRecords = await all(
          indexReader.findRecords(containingMultihash)
        )
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

        const { containingMultihash, packsMultihashes } =
          await packWriter.write(blob, createPackOptions)

        assert(packsMultihashes.length > 1)
        assert(containingMultihash)

        // Get records for containing and verify it has sub-records
        const containingRecords = await all(
          indexReader.findRecords(containingMultihash)
        )
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
            packsMultihashes.some((mh) =>
              equals(mh.bytes, record.multihash.bytes)
            )
          )
        }

        // Find Records for each pack and verify they have sub-records
        for (const multihash of packsMultihashes) {
          // Should not find records without containing
          const recordsWithoutContaining = await all(
            indexReader.findRecords(multihash)
          )
          assert(!recordsWithoutContaining.length)

          // Should find records with containing
          const records = await all(
            indexReader.findRecords(multihash, {
              containingMultihash,
            })
          )
          assert(records.length === 1)
          const packRecord = records[0]
          assert(packRecord)
          assert.strictEqual(
            packRecord.multihash.toString(),
            multihash.toString()
          )
          assert.strictEqual(
            packRecord.location.toString(),
            multihash.toString()
          )
          assert(!packRecord.offset)
          assert(!packRecord.length)
          assert.strictEqual(packRecord.type, IndexRecordType.PACK)
          assert(packRecord.subRecords.length > 0)
        }
      })

      it('should write pack with multiple blobs from a blob and index them with containing', async () => {
        const byteLength = 5_000_000
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @type {Map<string, API.MultihashDigest[]>} */
        const packBlobsMap = new Map()

        /** @typedef {API.PackWriterWriteOptions} */
        const createPackOptions = {
          type: /** @type {'car'} */ ('car'),
          /**
           * @type {import('@hash-stream/pack/types').PackWriterWriteOptions['onPackWrite']}
           */
          onPackWrite: (packMultihash, blobMultihashes) => {
            const encodedPackMultihash = base58btc.encode(packMultihash.bytes)
            packBlobsMap.set(encodedPackMultihash, blobMultihashes)
          },
        }

        const { containingMultihash } = await packWriter.write(
          blob,
          createPackOptions
        )

        assert(packBlobsMap.size === 1)
        const blobMultihashes = packBlobsMap.values().next().value || []

        const containingIndexRecord = await all(
          indexReader.findRecords(containingMultihash)
        )
        assert(containingIndexRecord.length === 1)
        // Check they have same number of subrecords
        assert(
          blobMultihashes.length ===
            containingIndexRecord[0].subRecords[0].subRecords.length
        )

        // Check if all blobs are in the containing index record
        for (const blobMultihash of blobMultihashes) {
          const indexRecords = await all(
            indexReader.findRecords(blobMultihash, { containingMultihash })
          )
          assert(indexRecords.length > 0)

          const indexRecord = indexRecords[0]
          assert(indexRecord)
          assert.strictEqual(
            indexRecord.multihash.toString(),
            blobMultihash.toString()
          )
          assert.strictEqual(
            indexRecord.location.toString(),
            containingIndexRecord[0].subRecords[0].multihash.toString()
          )
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
        const { containingMultihash, packsMultihashes } =
          await packWriter.write(blob, createPackOptions)
        assert(packsMultihashes.length > 1)
        assert(containingMultihash)

        const containingRecordsStream = await indexReader.findRecords(
          containingMultihash
        )
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
  })
}

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
