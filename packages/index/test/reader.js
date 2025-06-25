import assert from 'assert'
import { equals } from 'uint8arrays'
import all from 'it-all'
import { identity } from 'multiformats/hashes/identity'

import {
  Type,
  createFromBlob,
  createFromPack,
  createFromContaining,
  createFromInlineBlob,
} from '../src/record.js'
import { recordType } from '../src/writer/multiple-level.js'

import { randomBytes, randomCID } from './helpers/random.js'

/**
 * @typedef {import('@hash-stream/index/types').IndexReader} IndexReader
 *
 * @typedef {object} Destroyable
 * @property {() => void} destroy
 *
 * @typedef {object} IndexReaderWithStoreWriter
 * @property {import('@hash-stream/index/types').IndexStoreWriter} storeWriter
 *
 * @typedef {IndexReader & Destroyable & IndexReaderWithStoreWriter} DestroyableIndexReader
 */

/**
 * Runs the test suite for Index Reader.
 *
 * @param {string} indexReaderName - The name of the IndexReader implementation.
 * @param {() => Promise<DestroyableIndexReader>} createIndexReader - Function to create the index reader.
 */
export function runIndexReaderTests(indexReaderName, createIndexReader) {
  describe(`${indexReaderName}`, () => {
    /** @type {DestroyableIndexReader} */
    let indexReader

    beforeEach(async () => {
      indexReader = await createIndexReader()
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

      await indexReader.storeWriter.add(
        (async function* () {
          yield blob
        })(),
        recordType
      )

      const records = await all(indexReader.findRecords(blobCid.multihash))
      assert(records.length === 1)
      assert.strictEqual(records[0].offset, offset)
      assert.strictEqual(records[0].length, length)
      assert(typeof records[0].location !== 'string')
      assert(equals(records[0].location.digest, packCid.multihash.digest))
      assert(records[0].type === Type.BLOB)
    })

    it('can find index record for inline stored blob', async () => {
      const bytes = await randomBytes(100)
      const blobCid = await randomCID({ bytes })
      const { digest } = identity.digest(bytes)

      const offset = 0
      const length = 100

      const blob = createFromInlineBlob(
        blobCid.multihash,
        bytes,
        offset,
        length
      )

      await indexReader.storeWriter.add(
        (async function* () {
          yield blob
        })(),
        recordType
      )

      const records = await all(indexReader.findRecords(blobCid.multihash))
      assert(records.length === 1)
      assert.strictEqual(records[0].offset, offset)
      assert.strictEqual(records[0].length, length)
      assert(typeof records[0].location !== 'string')
      assert(equals(records[0].location.digest, digest))
      assert(records[0].type === Type.INLINE_BLOB)
    })

    it('can find index record for inline stored blob as containing', async () => {
      const bytes = await randomBytes(100)
      const blobCid = await randomCID({ bytes })
      const { digest } = identity.digest(bytes)

      const offset = 0
      const length = 100

      const blob = createFromInlineBlob(
        blobCid.multihash,
        bytes,
        offset,
        length
      )

      await indexReader.storeWriter.add(
        (async function* () {
          yield blob
        })(),
        recordType
      )

      const records = await all(
        indexReader.findRecords(blobCid.multihash, {
          containingMultihash: blobCid.multihash,
        })
      )
      assert(records.length === 1)
      assert.strictEqual(records[0].offset, offset)
      assert.strictEqual(records[0].length, length)
      assert(typeof records[0].location !== 'string')
      assert(equals(records[0].location.digest, digest))
      assert(records[0].type === Type.INLINE_BLOB)
    })

    it('can retrieve a containing index record with a pack composed by two Blobs', async () => {
      const content = await randomCID()
      const blobCids = await Promise.all(
        Array.from({ length: 2 }, async () => await randomCID())
      )
      const packCid = await randomCID()
      const record = createFromContaining(content.multihash, [
        createFromPack(
          packCid.multihash,
          packCid.multihash,
          blobCids.map((cid, i) =>
            createFromBlob(
              cid.multihash,
              packCid.multihash,
              i * 100,
              (i + 1) * 100
            )
          )
        ),
      ])

      await indexReader.storeWriter.add(
        (async function* () {
          yield record
        })(),
        recordType
      )

      const records = await all(indexReader.findRecords(content.multihash))
      assert(records.length === 1)

      assert(equals(records[0].multihash.digest, content.multihash.digest))
      assert.strictEqual(records[0].type, Type.CONTAINING)
      assert(typeof records[0].location !== 'string')
      assert(equals(records[0].location.digest, content.multihash.digest))
      assert.strictEqual(records[0].subRecords.length, 1)
      assert(
        equals(
          records[0].subRecords[0].multihash.digest,
          packCid.multihash.digest
        )
      )
      assert.strictEqual(records[0].subRecords[0].type, Type.PACK)
      assert.strictEqual(records[0].subRecords[0].subRecords.length, 2)
      for (const blobCid of blobCids) {
        const blobRecord = records[0].subRecords[0].subRecords.find((record) =>
          equals(record.multihash.digest, blobCid.multihash.digest)
        )
        assert(blobRecord)
        assert.strictEqual(blobRecord.type, Type.BLOB)
      }
    })

    it('can retrieve containing index records with multiple packs', async () => {
      const content = await randomCID()
      const packLength = 2
      const blobLength = 4
      const packCids = await Promise.all(
        Array.from({ length: packLength }, async () => await randomCID())
      )
      const blobCids = await Promise.all(
        Array.from({ length: blobLength }, async () => await randomCID())
      )

      const record = createFromContaining(
        content.multihash,
        packCids.map((packCid) =>
          createFromPack(
            packCid.multihash,
            packCid.multihash,
            blobCids.map((cid, i) =>
              createFromBlob(
                cid.multihash,
                packCid.multihash,
                i * 100,
                (i + 1) * 100
              )
            )
          )
        )
      )

      await indexReader.storeWriter.add(
        (async function* () {
          yield record
        })(),
        recordType
      )

      const records = await all(indexReader.findRecords(content.multihash))
      assert(records.length === 1)
      assert(equals(records[0].multihash.digest, content.multihash.digest))
      assert.strictEqual(records[0].type, Type.CONTAINING)
      assert(typeof records[0].location !== 'string')
      assert(equals(records[0].location.digest, content.multihash.digest))
      assert.strictEqual(records[0].subRecords.length, packLength)
      for (const packCid of packCids) {
        const packRecord = records[0].subRecords.find((record) =>
          equals(record.multihash.digest, packCid.multihash.digest)
        )
        assert(packRecord)
        assert.strictEqual(packRecord.type, Type.PACK)
        assert.strictEqual(packRecord.subRecords.length, blobLength)
      }
    })

    it('can store and retrieve containing index records with multiple packs atomically added', async () => {
      const content = await randomCID()
      const packLength = 2
      const blobLength = 4
      const packCids = await Promise.all(
        Array.from({ length: packLength }, async () => await randomCID())
      )
      const blobCids = await Promise.all(
        Array.from({ length: blobLength }, async () => await randomCID())
      )

      // Add each pack individually
      await Promise.all(
        packCids.map((packCid) => {
          return indexReader.storeWriter.add(
            (async function* () {
              yield createFromContaining(content.multihash, [
                createFromPack(
                  packCid.multihash,
                  packCid.multihash,
                  blobCids.map((cid, i) =>
                    createFromBlob(
                      cid.multihash,
                      packCid.multihash,
                      i * 100,
                      (i + 1) * 100
                    )
                  )
                ),
              ])
            })(),
            recordType
          )
        })
      )

      const records = await all(indexReader.findRecords(content.multihash))
      assert(records.length === 1)
      assert(equals(records[0].multihash.digest, content.multihash.digest))
      assert.strictEqual(records[0].type, Type.CONTAINING)
      assert(typeof records[0].location !== 'string')
      assert(equals(records[0].location.digest, content.multihash.digest))
      assert.strictEqual(records[0].subRecords.length, packLength)
      for (const packCid of packCids) {
        const packRecord = records[0].subRecords.find((record) =>
          equals(record.multihash.digest, packCid.multihash.digest)
        )
        assert(packRecord)
        assert.strictEqual(packRecord.type, Type.PACK)
        assert.strictEqual(packRecord.subRecords.length, blobLength)
      }
    })
  })
}
