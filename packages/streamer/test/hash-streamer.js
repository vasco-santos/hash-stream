import * as API from '../src/api.js'

import assert from 'assert'
import all from 'it-all'

import { recursive as exporter } from 'ipfs-unixfs-exporter'
import { equals } from 'uint8arrays'
import { base58btc } from 'multiformats/bases/base58'
import { CarWriter } from '@ipld/car/writer'
import { CarReader } from '@ipld/car/reader'
import { sha256 } from 'multiformats/hashes/sha2'
import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { decode as decodeDigest } from 'multiformats/hashes/digest'

import { IndexReader } from '@hash-stream/index/reader'
import {
  MultipleLevelIndexWriter,
  recordType,
} from '@hash-stream/index/writer/multiple-level'
import { createFromPack } from '@hash-stream/index/record'
import { PackWriter, PackReader, createPacks } from '@hash-stream/pack'

import { HashStreamer } from '../src/index.js'

import { randomBytes, randomCID } from './helpers/random.js'

const dagPbCode = 0x70

/**
 * @typedef {import('@hash-stream/index/types').IndexStore} IndexStore
 * @typedef {import('@hash-stream/pack/types').PackStore} PackStore
 *
 * @typedef {object} Destroyable
 * @property {() => void} destroy
 * @property {string} directory - Directory path for the store.
 *
 * @typedef {IndexStore & Destroyable} DestroyableIndexStore
 * @typedef {PackStore & Destroyable} DestroyablePackStore
 */

/**
 * Runs the test suite for hash streaming.
 *
 * @param {string} storeName - The name of the store (e.g., "Memory", "FS").
 * @param {() => Promise<DestroyableIndexStore>} createIndexStore - Function to create the index store.
 * @param {() => Promise<DestroyablePackStore>} createPackStore - Function to create the pack store.
 */
export function runHashStreamTests(
  storeName,
  createIndexStore,
  createPackStore
) {
  describe(`Hash streaming using ${storeName} Stores`, () => {
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
    /** @type {HashStreamer} */
    let hashStreamer

    beforeEach(async () => {
      indexStore = await createIndexStore()
      indexReader = new IndexReader(indexStore)
      indexWriter = new MultipleLevelIndexWriter(indexStore)

      packStore = await createPackStore()
      packWriter = new PackWriter(packStore, { indexWriters: [indexWriter] })

      packReader = new PackReader(packStore)
      hashStreamer = new HashStreamer(indexReader, packReader)
    })

    afterEach(() => {
      indexStore.destroy()
      packStore.destroy()
    })

    it('should return an empty stream when no blobs are found', async () => {
      const randomBlobCid = await randomCID()
      const verifiableBlobs = await all(
        hashStreamer.stream(randomBlobCid.multihash)
      )
      assert(verifiableBlobs.length === 0)
    })

    it('reads stream of verifiable blobs from a written blob inside a pack', async () => {
      const byteLength = 5_000_000
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])
      /** @type {Map<string, API.MultihashDigest[]>} */
      const packBlobsMap = new Map()

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

      for (const blobMultihash of blobMultihashes) {
        const verifiableBlobs = await all(
          hashStreamer.stream(blobMultihash, {
            containingMultihash,
          })
        )
        assert(verifiableBlobs.length === 1)
        // Verify hash and compute hash from retrieve bytes for verifiability
        const verifiableBlob = verifiableBlobs[0]
        assert(equals(verifiableBlob.multihash.bytes, blobMultihash.bytes))
        const computedHash = await sha256.digest(verifiableBlob.bytes)
        assert(equals(verifiableBlob.multihash.bytes, computedHash.bytes))
      }
    })
    it('reads stream of verifiable pack from a written pack with multiple blobs', async () => {
      const byteLength = 5_000_000
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])
      /** @type {Map<string, API.MultihashDigest[]>} */
      const packBlobsMap = new Map()

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
      const { containingMultihash, packsMultihashes } = await packWriter.write(
        blob,
        createPackOptions
      )

      assert(packsMultihashes.length === 1)
      const packMultihash = packsMultihashes[0]

      // Get verifiable blobs from the pack
      const verifiableBlobs = await all(
        hashStreamer.stream(packMultihash, {
          containingMultihash,
        })
      )

      // Get verifiable blobs multihashes known for the pack
      const blobMultihashes = packBlobsMap.values().next().value || []

      // Check if the blobs are the same
      assert(verifiableBlobs.length === blobMultihashes.length)
      for (const verifiableBlob of verifiableBlobs) {
        const computedHash = await sha256.digest(verifiableBlob.bytes)
        assert(equals(verifiableBlob.multihash.bytes, computedHash.bytes))

        // Check if the blob is in the known blobs map
        // @ts-ignore tsc does not know about the multihash type
        const blobMultihash = blobMultihashes.find((b) =>
          equals(b.bytes, verifiableBlob.multihash.bytes)
        )
        assert(blobMultihash)
        assert(equals(blobMultihash.bytes, verifiableBlob.multihash.bytes))
        assert(equals(blobMultihash.bytes, computedHash.bytes))
      }

      // Create a CAR from the blocks and verify it
      const { writer: carWriter, out } = await CarWriter.create([
        CID.createV1(dagPbCode, containingMultihash),
      ])

      // Collect CAR output into an in-memory Uint8Array
      /** @type {Uint8Array[]} */
      const chunks = []
      const collectChunks = (async () => {
        for await (const chunk of out) {
          chunks.push(chunk)
        }
      })()

      // Write retrieved Blobs into the CAR file
      for (const { multihash, bytes } of verifiableBlobs) {
        let cid
        if (equals(multihash.bytes, containingMultihash.bytes)) {
          // containing multihash not raw code
          cid = CID.createV1(0x70, multihash)
        } else {
          cid = CID.createV1(RawCode, multihash)
        }
        carWriter.put({ cid, bytes })
      }
      await carWriter.close()

      // Wait for chunk collection to complete
      await collectChunks

      // Compute the CAR multihash
      const writtenCarBytes = getBytesFromChunckedBytes(chunks)
      const carMultihash = await sha256.digest(writtenCarBytes)
      assert(equals(carMultihash.bytes, packMultihash.bytes))

      // Verify the created CAR file agains the one stored in the PackStore
      const carBytesFromPackStore = await packStore.get(packMultihash)
      assert(carBytesFromPackStore)
      assert(equals(carBytesFromPackStore, writtenCarBytes))
    })
    it('reads stream of containing multihash from written packs with multiple blobs and verifies it', async () => {
      const byteLength = 20_000_000
      const chunkSize = byteLength / 2
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])

      /** @type {Map<string, API.MultihashDigest[]>} */
      const packBlobsMap = new Map()

      const createPackOptions = {
        type: /** @type {'car'} */ ('car'),
        shardSize: chunkSize,
        /**
         * @type {import('@hash-stream/pack/types').PackWriterWriteOptions['onPackWrite']}
         */
        onPackWrite: (packMultihash, blobMultihashes) => {
          const encodedPackMultihash = base58btc.encode(packMultihash.bytes)
          packBlobsMap.set(encodedPackMultihash, blobMultihashes)
        },
      }
      const { containingMultihash, packsMultihashes } = await packWriter.write(
        blob,
        createPackOptions
      )

      assert(packsMultihashes.length === 3)

      // Create a CAR file to store the containing multihash blobs
      const { writer: carWriter, out } = await CarWriter.create([
        CID.createV1(dagPbCode, containingMultihash),
      ])

      // Collect CAR output into an in-memory Uint8Array
      /** @type {Uint8Array[]} */
      const chunks = []
      const collectChunks = (async () => {
        for await (const chunk of out) {
          chunks.push(chunk)
        }
      })()

      // Get verifiable blobs from the containing and write them into the CAR
      for await (const { multihash, bytes } of hashStreamer.stream(
        containingMultihash
      )) {
        let cid
        if (equals(multihash.bytes, containingMultihash.bytes)) {
          // containing multihash not raw code
          cid = CID.createV1(0x70, multihash)
        } else {
          cid = CID.createV1(RawCode, multihash)
        }
        carWriter.put({ cid, bytes })
      }
      await carWriter.close()

      // Wait for chunk collection to complete
      await collectChunks

      // Read the CAR file generated
      const writtenCarBytes = getBytesFromChunckedBytes(chunks)
      const readerBlockStore = await CarReader.fromBytes(writtenCarBytes)
      const roots = await readerBlockStore.getRoots()
      assert(roots.length === 1)

      // Reconstruct blob with unixfs exporter
      const entries = exporter(roots[0], {
        async get(cid) {
          const block = await readerBlockStore.get(cid)
          if (!block) {
            throw new Error(`Block not found in exported content: ${cid}`)
          }
          return block.bytes
        },
      })

      const fileEntries = await all(entries)
      assert(fileEntries.length === 1)
      const file = fileEntries[0]
      const collectedFileChunks = await all(file.content())
      const writtenContentBytes = getBytesFromChunckedBytes(collectedFileChunks)

      // Guarantees read file from pack is exactly the same as written before
      assert.strictEqual(writtenContentBytes.length, bytes.length)
      assert(equals(writtenContentBytes, bytes))
    })

    it('reads stream of verifiable pack from a written pack without indexed blobs', async () => {
      const byteLength = 5_000_000
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])

      const { packStream } = createPacks(blob, {
        type: /** @type {'car'} */ ('car'),
      })
      const packs = await all(packStream)
      assert(packs.length === 1)

      // Store created Pack
      const pack = packs[0]
      await packStore.put(pack.multihash, pack.bytes)

      // Add index for Pack without subrecords
      await indexStore.add(
        (async function* () {
          // Yield only the pack
          yield createFromPack(pack.multihash, pack.multihash, [])
        })(),
        recordType
      )

      // Get verifiable blobs from the pack
      const verifiableBlobs = await all(hashStreamer.stream(pack.multihash))
      assert(verifiableBlobs.length === 1)
      const verifiableBlob = verifiableBlobs[0]
      assert(equals(verifiableBlob.multihash.bytes, pack.multihash.bytes))
      const computedHash = await sha256.digest(verifiableBlob.bytes)
      assert(equals(verifiableBlob.multihash.bytes, computedHash.bytes))
    })

    it('reads stream of verifiable pack from a written pack with path', async () => {
      const byteLength = 5_000_000
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])
      /** @type {Map<string, Uint8Array>} */
      const createdPacks = new Map()

      // Write the Packs
      const createPackOptions = {
        type: /** @type {'car'} */ ('car'),
      }

      // Create packs separately for writing
      const { packStream } = createPacks(blob, createPackOptions)

      // Iterate through each pack in the pack stream and store them
      for await (const { multihash, bytes } of packStream) {
        // Store the pack in the createdPacks map to compare later
        const encodedKey = `${packStore.directory}${base58btc.encode(
          multihash.bytes
        )}`
        createdPacks.set(encodedKey, bytes)
        await packStore.put(encodedKey, bytes)
      }

      // Add index for Pack without subrecords
      await indexStore.add(
        (async function* () {
          // Yield only the pack
          for (const [key] of createdPacks.entries()) {
            const encodedMultihash = key.replace(packStore.directory, '')
            const multihash = decodeDigest(base58btc.decode(encodedMultihash))
            yield createFromPack(multihash, key, [])
          }
        })(),
        recordType
      )

      for (const [key] of createdPacks.entries()) {
        const encodedMultihash = key.replace(packStore.directory, '')
        const multihash = decodeDigest(base58btc.decode(encodedMultihash))
        const verifiableBlobs = await all(hashStreamer.stream(multihash))
        assert(verifiableBlobs.length === 1)
        const verifiableBlob = verifiableBlobs[0]
        assert(equals(verifiableBlob.multihash.bytes, multihash.bytes))
        const computedHash = await sha256.digest(verifiableBlob.bytes)
        assert(equals(verifiableBlob.multihash.bytes, computedHash.bytes))
      }
    })
  })
}

/**
 *
 * @param {Uint8Array[]} chunks
 */
function getBytesFromChunckedBytes(chunks) {
  const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const writtenCarBytes = new Uint8Array(totalSize)
  let offset = 0
  for (const chunk of chunks) {
    writtenCarBytes.set(chunk, offset)
    offset += chunk.length
  }
  return writtenCarBytes
}
