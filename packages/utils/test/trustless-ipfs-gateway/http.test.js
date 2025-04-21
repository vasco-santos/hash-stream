import assert from 'assert'

import { CarReader } from '@ipld/car'
import { CID } from 'multiformats'
import { base58btc } from 'multiformats/bases/base58'
import { sha256 } from 'multiformats/hashes/sha2'
import { code as RawCode } from 'multiformats/codecs/raw'
import { equals } from 'uint8arrays'
import { recursive as exporter } from 'ipfs-unixfs-exporter'
import all from 'it-all'

import { MemoryIndexStore } from '@hash-stream/index/store/memory'
import { IndexReader } from '@hash-stream/index/reader'
import { MultipleLevelIndexWriter } from '@hash-stream/index/writer/multiple-level'
import { MemoryPackStore } from '@hash-stream/pack/store/memory'
import { PackWriter, PackReader } from '@hash-stream/pack'
import { HashStreamer } from '@hash-stream/streamer'

import {
  asCarReadableStream,
  asRawUint8Array,
} from '../../src/trustless-ipfs-gateway/streamer.js'
import {
  buildCarHTTPResponse,
  buildRawHTTPResponse,
  ipfsGet,
  rawGet,
  carGet,
} from '../../src/trustless-ipfs-gateway/http.js'
import { identityCid } from '../../src/trustless-ipfs-gateway/cid.js'

import { randomBytes, randomCID } from '../helpers/random.js'

const dagPbCode = 0x70

describe(`trustless ipfs gateway http utils`, () => {
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
    packWriter = new PackWriter(packStore, { indexWriters: [indexWriter] })

    packReader = new PackReader(packStore)
    hashStreamer = new HashStreamer(indexReader, packReader)
  })

  it('handles a RAW format ipfs get http request', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])

    const createPackOptions = {
      type: /** @type {'car'} */ ('car'),
      /**
       * @type {import('@hash-stream/pack/types').PackWriterWriteOptions['onPackWrite']}
       */
      onPackWrite: () => {},
    }
    const { packsMultihashes, containingMultihash } = await packWriter.write(
      blob,
      createPackOptions
    )
    assert(packsMultihashes.length === 1)

    const cid = CID.createV1(RawCode, containingMultihash)
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.raw',
      },
    })

    const response = await ipfsGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 200)
    assert.strictEqual(
      response.headers.get('Content-Type'),
      'application/vnd.ipld.raw'
    )
  })

  it('handles a CAR format ipfs get http request', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])

    const createPackOptions = {
      type: /** @type {'car'} */ ('car'),
      /**
       * @type {import('@hash-stream/pack/types').PackWriterWriteOptions['onPackWrite']}
       */
      onPackWrite: () => {},
    }
    const { packsMultihashes, containingMultihash } = await packWriter.write(
      blob,
      createPackOptions
    )
    assert(packsMultihashes.length === 1)

    const cid = CID.createV1(dagPbCode, containingMultihash)
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.car',
      },
    })

    const response = await ipfsGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 200)
    assert.strictEqual(
      response.headers.get('Content-Type'),
      'application/vnd.ipld.car; version=1; order=1; dups=y'
    )
  })

  it('handles gracefully unknown format on ipfs get http request', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])

    const createPackOptions = {
      type: /** @type {'car'} */ ('car'),
      /**
       * @type {import('@hash-stream/pack/types').PackWriterWriteOptions['onPackWrite']}
       */
      onPackWrite: () => {},
    }
    const { packsMultihashes, containingMultihash } = await packWriter.write(
      blob,
      createPackOptions
    )
    assert(packsMultihashes.length === 1)

    const cid = CID.createV1(dagPbCode, containingMultihash)
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.unknown',
      },
    })

    const response = await ipfsGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 406)
  })

  it('handles a RAW format ipfs get identity probe http request', async () => {
    const request = new Request(`https://example.com/ipfs/${identityCid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.raw',
      },
    })

    const response = await ipfsGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 200)
    assert.strictEqual(
      response.headers.get('Content-Type'),
      'application/vnd.ipld.raw'
    )
    assert.strictEqual((await response.arrayBuffer()).byteLength, 0)
  })

  it('handles a CAR format ipfs get identity probe http request', async () => {
    const request = new Request(`https://example.com/ipfs/${identityCid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.car',
      },
    })

    const response = await ipfsGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 200)
    assert.strictEqual(
      response.headers.get('Content-Type'),
      'application/vnd.ipld.car; version=1; order=1; dups=y'
    )

    // Get Body
    const body = await response.arrayBuffer()
    assert(body)
    const bodyBytes = new Uint8Array(body)

    // Check root has identity and there is no blocks
    const car = await CarReader.fromBytes(bodyBytes)
    const roots = await car.getRoots()
    assert(roots.length === 1)
    assert(equals(roots[0].multihash.bytes, identityCid.multihash.bytes))

    let blocks = []
    for await (let block of car.blocks()) {
      blocks.push(block)
    }
    assert(blocks.length === 0)
  })

  it('handles a RAW format http request', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])

    const createPackOptions = {
      type: /** @type {'car'} */ ('car'),
      /**
       * @type {import('@hash-stream/pack/types').PackWriterWriteOptions['onPackWrite']}
       */
      onPackWrite: () => {},
    }
    const { packsMultihashes, containingMultihash } = await packWriter.write(
      blob,
      createPackOptions
    )
    assert(packsMultihashes.length === 1)
    const packMultihash = packsMultihashes[0]

    const cid = CID.createV1(RawCode, containingMultihash)
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.raw',
      },
    })

    const response = await rawGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 200)
    assert.strictEqual(
      response.headers.get('Content-Type'),
      'application/vnd.ipld.raw'
    )

    // Get Body
    const body = await response.arrayBuffer()
    assert(body)
    const bodyBytes = new Uint8Array(body)

    // Compare Body with original bytes in written pack
    const packBytes = await packStore.get(packMultihash)
    assert(packBytes)
    const readerBlockStore = await CarReader.fromBytes(packBytes)
    const blobInPack = await readerBlockStore.get(
      CID.createV1(dagPbCode, containingMultihash)
    )
    assert(blobInPack)
    assert(equals(bodyBytes, blobInPack.bytes))
  })

  it('handles a CAR format http request', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])

    const createPackOptions = {
      type: /** @type {'car'} */ ('car'),
      /**
       * @type {import('@hash-stream/pack/types').PackWriterWriteOptions['onPackWrite']}
       */
      onPackWrite: () => {},
    }
    const { packsMultihashes, containingMultihash } = await packWriter.write(
      blob,
      createPackOptions
    )
    assert(packsMultihashes.length === 1)

    const cid = CID.createV1(dagPbCode, containingMultihash)
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.car',
      },
    })

    const response = await carGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 200)
    assert.strictEqual(
      response.headers.get('Content-Type'),
      'application/vnd.ipld.car; version=1; order=1; dups=y'
    )

    // Get Body
    const body = await response.arrayBuffer()
    assert(body)
    const bodyBytes = new Uint8Array(body)

    const readerBlockStore = await CarReader.fromBytes(bodyBytes)
    const roots = await readerBlockStore.getRoots()
    assert(roots.length === 1)

    // Compare Body with original bytes in written pack
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

  it('fails to handle CAR format http request with invalid cid', async () => {
    const cid = 'not-balid-cid'
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.car',
      },
    })

    const response = await carGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 400)
  })

  it('fails to handle RAW format http request with invalid cid', async () => {
    const cid = 'not-balid-cid'
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.car',
      },
    })

    const response = await rawGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 400)
  })

  it('fails to handle CAR format http request with invalid version', async () => {
    const cid = await randomCID()
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.car; version=2; order=1; dups=y',
      },
    })

    const response = await carGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 400)
  })

  it('fails to handle CAR format http request with unknown cid', async () => {
    const cid = await randomCID()
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.car',
      },
    })

    const response = await carGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 404)
  })

  it('fails to handle RAW format http request with unknown cid', async () => {
    const cid = await randomCID()
    const request = new Request(`https://example.com/ipfs/${cid}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.ipld.raw',
      },
    })

    const response = await rawGet(request, { hashStreamer })
    assert(response)
    assert.strictEqual(response.status, 404)
  })

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
      const verifiableBlobsAsyncIterable = hashStreamer.stream(blobMultihash, {
        containingMultihash,
      })
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
