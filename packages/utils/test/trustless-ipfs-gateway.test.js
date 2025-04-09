import assert from 'assert'

import { CID } from 'multiformats'
import { base58btc } from 'multiformats/bases/base58'
import { sha256 } from 'multiformats/hashes/sha2'
import { code as RawCode } from 'multiformats/codecs/raw'
import { CarReader } from '@ipld/car'
import { recursive as exporter } from 'ipfs-unixfs-exporter'

import { MemoryIndexStore } from '@hash-stream/index/store/memory'
import { IndexReader } from '@hash-stream/index/reader'
import { MultipleLevelIndexWriter } from '@hash-stream/index/writer/multiple-level'
import { MemoryPackStore } from '@hash-stream/pack/store/memory'
import { PackWriter, PackReader } from '@hash-stream/pack'
import { HashStreamer } from '@hash-stream/streamer'

import all from 'it-all'
import { equals } from 'uint8arrays'

import {
  asCarReadableStream,
  asRawUint8Array,
} from '../src/trustless-ipfs-gateway/streamer.js'
import { normalizeCid } from '../src/trustless-ipfs-gateway/cid.js'
import {
  buildCarHTTPResponse,
  buildRawHTTPResponse,
} from '../src/trustless-ipfs-gateway/http.js'

import { randomBytes, randomCID } from './helpers/random.js'

const dagPbCode = 0x70

describe(`trustless ipfs gateway utils`, () => {
  /** @type {import('@hash-stream/index/types').IndexStore} */
  let indexStore
  /** @type {import('@hash-stream/index/types').IndexReader} */
  let indexReader
  /** @type {import('@hash-stream/index/types').IndexWriter} */
  let indexWriter
  /** @type {import('@hash-stream/pack/types').PackStore} */
  let packStore
  /** @type {PackWriter} */
  let packWriter
  /** @type {PackReader} */
  let packReader
  /** @type {HashStreamer} */
  let hashStreamer

  beforeEach(() => {
    indexStore = new MemoryIndexStore()
    indexReader = new IndexReader(indexStore)
    indexWriter = new MultipleLevelIndexWriter(indexStore)
    packStore = new MemoryPackStore()
    packWriter = new PackWriter(packStore, { indexWriter })

    packReader = new PackReader(packStore)
    hashStreamer = new HashStreamer(indexReader, packReader)
  })

  describe('streamer', () => {
    it('transforms verifiable blobs async iterator representing a blob into a readable stream as Raw', async () => {
      const byteLength = 5_000_000
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])

      /** @type {Map<string, import('multiformats').MultihashDigest[]>} */
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
        // Get the verifiable blobs from the blob async iterable
        const verifiableBlobsAsyncIterable = hashStreamer.stream(
          blobMultihash,
          {
            containingMultihash,
          }
        )
        // transform the verifiable blobs async iterable into a Raw uint8array
        const rawUint8Array = await asRawUint8Array(
          blobMultihash,
          verifiableBlobsAsyncIterable
        )
        assert(rawUint8Array)

        // Validate hash represents the requested content
        const computedHash = await sha256.digest(rawUint8Array)
        assert(equals(blobMultihash.bytes, computedHash.bytes))
      }
    })

    it('transforms verifiable blobs async iterator representing a pack into a readable stream as a CAR file', async () => {
      const byteLength = 5_000_000
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])

      /** @type {Map<string, import('multiformats').MultihashDigest[]>} */
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

      // Get the verifiable blobs from the pack async iterable
      const verifiableBlobsAsyncIterable = hashStreamer.stream(packMultihash, {
        containingMultihash,
      })

      // transform the verifiable blobs async iterable into a CAR readable stream
      const containingCid = CID.createV1(dagPbCode, containingMultihash)
      const carReadableStream = await asCarReadableStream(
        containingMultihash,
        verifiableBlobsAsyncIterable,
        {
          roots: [containingCid],
        }
      )
      assert(carReadableStream)
      const readBytes = await readAllBytes(carReadableStream)

      // Compute the CAR multihash
      const carMultihash = await sha256.digest(readBytes)
      assert(equals(carMultihash.bytes, packMultihash.bytes))

      // Verify the created CAR file agains the one stored in the PackStore
      const carBytesFromPackStore = await packReader.storeReader.get(
        packMultihash
      )
      assert(carBytesFromPackStore)
      assert(equals(carBytesFromPackStore, readBytes))
    })

    it('transforms verifiable blobs async iterator representing a containing into a readable stream as a CAR file', async () => {
      const byteLength = 20_000_000
      const chunkSize = byteLength / 2
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])

      /** @type {Map<string, import('multiformats').MultihashDigest[]>} */
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

      // Get the verifiable blobs async iterable
      const verifiableBlobsAsyncIterable =
        hashStreamer.stream(containingMultihash)

      // transform the verifiable blobs async iterable into a CAR readable stream
      const containingCid = CID.createV1(dagPbCode, containingMultihash)
      const carReadableStream = await asCarReadableStream(
        containingMultihash,
        verifiableBlobsAsyncIterable,
        {
          roots: [containingCid],
        }
      )
      assert(carReadableStream)

      const readBytes = await readAllBytes(carReadableStream)
      const readerBlockStore = await CarReader.fromBytes(readBytes)
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

    it('transforms verifiable blobs async iterator into a readable stream as Raw returns undefined when not found', async () => {
      const cid = await randomCID()
      const blobMultihash = cid.multihash

      // Get the verifiable blobs from the blob async iterable
      const verifiableBlobsAsyncIterable = hashStreamer.stream(blobMultihash)
      // transform the verifiable blobs async iterable into a Raw uint8array
      const rawUint8Array = await asRawUint8Array(
        blobMultihash,
        verifiableBlobsAsyncIterable
      )
      assert(!rawUint8Array)
    })

    it('transforms verifiable blobs async iterator into a readable stream as CAR returns undefined when not found', async () => {
      const cid = await randomCID()
      const blobMultihash = cid.multihash

      // Get the verifiable blobs from the blob async iterable
      const verifiableBlobsAsyncIterable = hashStreamer.stream(blobMultihash)
      // transform the verifiable blobs async iterable into a Raw uint8array
      const rawUint8Array = await asCarReadableStream(
        blobMultihash,
        verifiableBlobsAsyncIterable
      )
      assert(!rawUint8Array)
    })
  })

  describe('normalize cid', () => {
    it('normalizes a CID string to a CID', async () => {
      const cid = await randomCID()
      const normalizedCid = await normalizeCid(cid.toString())
      assert(cid.equals(normalizedCid))
    })
    it('fails to normalized a CID string that represents an invalid cid', async () => {
      const cidString = 'invalid-cid-string'
      await assert.rejects(() => normalizeCid(cidString))
    })
  })

  describe('http', () => {
    it('builds a HTTP response with the content behind a given CID in RAW format', async () => {
      const byteLength = 5_000_000
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])

      /** @type {Map<string, import('multiformats').MultihashDigest[]>} */
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
        // Get the verifiable blobs from the blob async iterable
        const verifiableBlobsAsyncIterable = hashStreamer.stream(
          blobMultihash,
          {
            containingMultihash,
          }
        )
        // transform the verifiable blobs async iterable into a Raw uint8array
        const cid = CID.createV1(RawCode, blobMultihash)
        const rawUint8Array = await asRawUint8Array(
          blobMultihash,
          verifiableBlobsAsyncIterable
        )
        assert(rawUint8Array)

        // Build HTTP Response
        const httpResponse = buildRawHTTPResponse(cid, rawUint8Array, {
          fileName: 'test.bin',
        })
        assert(httpResponse)
        assert.strictEqual(httpResponse.status, 200)
        assert.strictEqual(
          httpResponse.headers.get('Content-Type'),
          'application/vnd.ipld.raw'
        )
        assert.strictEqual(
          httpResponse.headers.get('Content-Length'),
          String(rawUint8Array.byteLength)
        )
        assert.strictEqual(httpResponse.headers.get('Etag'), `"${cid}.raw"`)

        // Verify body
        const body = await httpResponse.arrayBuffer()
        assert(body)
        const bodyBytes = new Uint8Array(body)
        assert.strictEqual(bodyBytes.byteLength, rawUint8Array.byteLength)
        assert(equals(bodyBytes, rawUint8Array))
      }
    })

    it('builds a HTTP response with the content behind a given CID in CAR format', async () => {
      const byteLength = 5_000_000
      const bytes = await randomBytes(byteLength)
      const blob = new Blob([bytes])

      /** @type {Map<string, import('multiformats').MultihashDigest[]>} */
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

      // Get the verifiable blobs from the pack async iterable
      const verifiableBlobsAsyncIterable = hashStreamer.stream(packMultihash, {
        containingMultihash,
      })

      // transform the verifiable blobs async iterable into a CAR readable stream
      const containingCid = CID.createV1(dagPbCode, containingMultihash)
      const carReadableStream = await asCarReadableStream(
        containingMultihash,
        verifiableBlobsAsyncIterable,
        {
          roots: [containingCid],
        }
      )
      assert(carReadableStream)

      // Build HTTP response
      const httpResponse = buildCarHTTPResponse(
        containingCid,
        carReadableStream,
        {
          version: 1,
          dups: true,
          fileName: 'test.car',
        }
      )
      assert(httpResponse)
      assert.strictEqual(httpResponse.status, 200)
      assert.strictEqual(
        httpResponse.headers.get('Content-Type'),
        'application/vnd.ipld.car; version=1; order=1; dups=y'
      )
      assert.strictEqual(
        httpResponse.headers.get('Content-Disposition'),
        'attachment; filename="test.car"; filename*=UTF-8\'\'test.car'
      )
      assert.strictEqual(
        httpResponse.headers.get('Etag'),
        `W/"${containingCid}.car"`
      )
      assert.strictEqual(httpResponse.headers.get('Accept-Ranges'), 'none')

      // Verify body
      const body = await httpResponse.arrayBuffer()
      assert(body)
      const bodyBytes = new Uint8Array(body)

      // const readBytes = await readAllBytes(carReadableStream)

      // Compute the CAR multihash
      const carMultihash = await sha256.digest(bodyBytes)
      assert(equals(carMultihash.bytes, packMultihash.bytes))

      // Verify the read CAR file agains the one stored in the PackStore
      const carBytesFromPackStore = await packReader.storeReader.get(
        packMultihash
      )
      assert(carBytesFromPackStore)
      assert(equals(carBytesFromPackStore, bodyBytes))
    })
  })
})

/**
 * Reads all bytes from a ReadableStream<Uint8Array> into a single Uint8Array.
 *
 * @param {ReadableStream<Uint8Array>} readableStream - The readable stream to read from.
 * @returns {Promise<Uint8Array>} - A Uint8Array containing all the bytes from the stream.
 */
export async function readAllBytes(readableStream) {
  const reader = readableStream.getReader()
  const chunks = []
  let totalLength = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    totalLength += value.length
  }

  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
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
