import assert from 'assert'
import all from 'it-all'
import { CarReader } from '@ipld/car'
import { base58btc } from 'multiformats/bases/base58'
import { equals } from 'uint8arrays/equals'
import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'

import { IndexReader } from '@hash-stream/index/reader'
import { MultipleLevelIndexWriter } from '@hash-stream/index/writer/multiple-level'
import { Type as IndexRecordType } from '@hash-stream/index/record'

import { createPacks } from '../src/index.js'
import { PackReader } from '../src/reader.js'
import { PackWriter } from '../src/writer.js'

import { randomBytes, randomCID } from './helpers/random.js'

/**
 * @typedef {import('@hash-stream/pack/types').PackStore} PackStore
 * @typedef {import('@hash-stream/index/types').IndexStore} IndexStore
 *
 * @typedef {object} Destroyable
 * @property {() => void} destroy
 * @property {string} directory - Directory path for the store.
 *
 * @typedef {PackStore & Destroyable} DestroyablePackStore
 * @typedef {IndexStore & Destroyable} DestroyableIndexStore
 */

/**
 * Runs the test suite for Pack Reader.
 *
 * @param {string} storeName - The name of the store (e.g., "Memory", "FS").
 * @param {() => Promise<DestroyablePackStore>} createPackStore - Function to create the pack store.
 * @param {() => Promise<DestroyableIndexStore>} createIndexStore - Function to create the index store.
 */
export function runPackReaderTests(
  storeName,
  createPackStore,
  createIndexStore
) {
  describe('reader', () => {
    describe(`read packs in ${storeName} store`, () => {
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
      /** @type {PackReader} */
      let packReader

      beforeEach(async () => {
        // Create Index
        indexStore = await createIndexStore()
        indexReader = new IndexReader(indexStore)
        indexWriter = new MultipleLevelIndexWriter(indexStore)

        // Create Pack Writer
        packStore = await createPackStore()
        packWriter = new PackWriter(packStore, {
          indexWriters: [indexWriter],
        })

        // Create Pack Reader
        packReader = new PackReader(packStore)
      })

      afterEach(() => {
        indexStore.destroy()
        packStore.destroy()
      })

      it('reads packs from the store after they are written', async () => {
        const byteLength = 30_000_000
        const chunkSize = byteLength / 3
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @type {Map<string, Uint8Array>} */
        const createdPacks = new Map()

        // Write the Packs
        const createPackOptions = {
          shardSize: chunkSize,
          type: /** @type {'car'} */ ('car'),
        }
        const { packsMultihashes } = await packWriter.write(
          blob,
          createPackOptions
        )

        // Create packs separately for comparison
        const { packStream } = createPacks(blob, createPackOptions)

        // Iterate through each pack in the pack stream
        for await (const { multihash, bytes } of packStream) {
          // Store the pack in the createdPacks map
          createdPacks.set(base58btc.encode(multihash.bytes), bytes)
        }

        assert(packsMultihashes.length === createdPacks.size)

        // Get stream of bytes of the packs created and compare them
        for (const pack of packsMultihashes) {
          for await (const entry of packReader.stream(pack)) {
            assert(entry)
            assert(equals(entry.multihash.bytes, pack.bytes))

            // Verify the entry bytes
            const packKey = base58btc.encode(entry.multihash.bytes)
            const createdPack = createdPacks.get(packKey)
            assert(createdPack)
            assert(equals(entry.bytes, createdPack))
          }
        }
      })

      it('reads packs from the store after they are written with byte ranges', async () => {
        const byteLength = 30_000_000
        const chunkSize = byteLength / 3
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @type {Map<string, Uint8Array>} */
        const createdPacks = new Map()

        // Write the Packs
        const createPackOptions = {
          shardSize: chunkSize,
          type: /** @type {'car'} */ ('car'),
        }
        const { packsMultihashes, containingMultihash } =
          await packWriter.write(blob, createPackOptions)

        // Create packs separately for comparison
        const { packStream } = createPacks(blob, createPackOptions)

        // Iterate through each pack in the pack stream
        for await (const { multihash, bytes } of packStream) {
          // Store the pack in the createdPacks map
          createdPacks.set(base58btc.encode(multihash.bytes), bytes)
        }

        // Get index records for the created packs
        for (const pack of packsMultihashes) {
          const indexRecords = await all(
            indexReader.findRecords(pack, { containingMultihash })
          )
          assert(indexRecords.length === 1)
          const indexRecord = indexRecords[0]

          // Get locations to read from the PackReader
          const locationsToRead = []
          for (const record of indexRecord.subRecords) {
            assert(record.type === IndexRecordType.BLOB)

            const { offset, length, multihash } = record
            assert(offset)
            assert(length)
            locationsToRead.push({ offset, length, multihash })
          }

          // Read the pack locations with the PackReader
          const packVerifiableEntries = await all(
            packReader.stream(pack, locationsToRead)
          )
          assert(packVerifiableEntries.length === locationsToRead.length)

          // Compare the bytes of each blob with the ones in created packs
          const packBytes = createdPacks.get(base58btc.encode(pack.bytes))
          assert(packBytes)
          const carReader = await CarReader.fromBytes(packBytes)

          for (const entry of packVerifiableEntries) {
            let blobCid
            if (equals(entry.multihash.bytes, containingMultihash.bytes)) {
              // containing multihash not raw code
              blobCid = CID.createV1(0x70, entry.multihash)
            } else {
              blobCid = CID.createV1(RawCode, entry.multihash)
            }
            const carReaderBlob = await carReader.get(blobCid)
            assert(equals(entry.bytes, carReaderBlob.bytes))
          }
        }
      })

      it('reads content from the store after they are written as a path', async () => {
        const byteLength = 30_000_000
        const chunkSize = byteLength / 3
        const bytes = await randomBytes(byteLength)
        const blob = new Blob([bytes])
        /** @type {Map<string, Uint8Array>} */
        const createdPacks = new Map()

        // Write the Packs
        const createPackOptions = {
          shardSize: chunkSize,
          type: /** @type {'car'} */ ('car'),
        }

        // Create packs separately for writing
        const { packStream } = createPacks(blob, createPackOptions)

        // Iterate through each pack in the pack stream
        for await (const { multihash, bytes } of packStream) {
          // Store the pack in the createdPacks map to compare later
          const encodedKey = `${packStore.directory}${base58btc.encode(
            multihash.bytes
          )}`
          createdPacks.set(encodedKey, bytes)
          await packStore.put(encodedKey, bytes)
        }

        for (const pack of createdPacks.keys()) {
          for await (const entry of packReader.stream(pack)) {
            assert(entry)

            // Verify the entry bytes
            const writtenBytes = createdPacks.get(pack)
            assert(writtenBytes)
            assert(equals(entry.bytes, writtenBytes))
          }
        }
      })

      it('reading non existing packs from the reader returns empty stream', async () => {
        const cid = await randomCID()
        const packMultihash = cid.multihash

        const entries = await all(packReader.stream(packMultihash))
        assert(entries.length === 0)
      })

      it('reading non existing packs from the reader with range returns empty stream', async () => {
        const cid = await randomCID()
        const packMultihash = cid.multihash

        const entries = await all(
          packReader.stream(packMultihash, [
            {
              offset: 0,
              length: 100,
              multihash: packMultihash,
            },
          ])
        )
        assert(entries.length === 0)
      })
    })
  })
}
