import * as API from '../../src/index/api.js'
import assert from 'assert'

import * as PB from '@ipld/dag-pb'
import { sha256 } from 'multiformats/hashes/sha2'
import { withMaxChunkSize } from '@vascosantos/unixfs/file/chunker/fixed'
import { equals } from 'uint8arrays/equals'
import { concat } from 'uint8arrays/concat'
import all from 'it-all'

import { MemoryPackStore } from '@hash-stream/pack/store/memory'
import { PackReader } from '@hash-stream/pack'
import { MemoryIndexStore } from '@hash-stream/index/store/memory'
import {
  SingleLevelIndexWriter,
  MultipleLevelIndexWriter,
  IndexReader,
} from '@hash-stream/index'
import { Type } from '@hash-stream/index/record'
import { HashStreamer } from '@hash-stream/streamer'

import {
  createUnixFsStreams,
  writeUnixFsFileLinkIndex,
  MAX_CHUNK_SIZE,
  defaultSettings,
} from '../../src/index/unixfs.js'

import { randomBytes } from '../helpers/random.js'

describe(`unixfs index preparation`, () => {
  /** @type {import('@hash-stream/index/types').IndexWriter} */
  let singleLevelIndexWriter
  /** @type {import('@hash-stream/index/types').IndexWriter} */
  let multipleLevelIndexWriter
  /** @type {import('@hash-stream/index/types').IndexStore} */
  let indexStore
  /** @type {import('@hash-stream/index/types').IndexReader} */
  let indexReader
  /** @type {import('@hash-stream/pack/types').PackStore} */
  let packStore
  /** @type {import('@hash-stream/pack/types').PackReader} */
  let packReader
  /** @type {import('@hash-stream/streamer/types').HashStreamer} */
  let hashStreamer

  beforeEach(async () => {
    indexStore = new MemoryIndexStore()
    indexReader = new IndexReader(indexStore)
    singleLevelIndexWriter = new SingleLevelIndexWriter(indexStore)
    multipleLevelIndexWriter = new MultipleLevelIndexWriter(indexStore)
    packStore = new MemoryPackStore()
    packReader = new PackReader(packStore)
    hashStreamer = new HashStreamer(indexReader, packReader)
  })

  it('creates an unixfs filelink stream', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    /** @type {API.Block | undefined} */
    let rootBlock

    const { unixFsFileLinkReadable, unixFsReadable } = createUnixFsStreams(blob)
    void (async () => {
      rootBlock = await readLast(unixFsReadable)
    })()
    const unixFsFileLinkEntries = await readAll(unixFsFileLinkReadable)

    // Validate root CID for unixFS
    const [rootFileLink] = unixFsFileLinkEntries.splice(
      unixFsFileLinkEntries.length - 1,
      1
    )
    assert.ok(rootFileLink)
    assert.equal(rootFileLink.cid.code, PB.code)
    assert.equal(rootFileLink.contentByteLength, byteLength)
    assert.ok(rootFileLink.dagByteLength > byteLength)
    assert.ok(!rootFileLink.contentByteOffset)

    // Check root block
    assert.ok(rootBlock)
    assert(rootBlock.cid.equals(rootFileLink.cid))

    assert.ok(unixFsFileLinkEntries.length)
    assert.equal(unixFsFileLinkEntries.length, 5)
    let currentOffset = 0
    for (const entry of unixFsFileLinkEntries) {
      assert.ok(entry, 'has entry')
      assert.equal(rootFileLink.cid.code, PB.code, 'has dag DAG PB code')
      assert.equal(
        entry.contentByteOffset,
        currentOffset,
        'has expected content byte offset'
      )
      assert.ok(
        entry.contentByteLength !== undefined,
        'has content byte length filled in'
      )
      assert.ok(
        entry.contentByteLength <= MAX_CHUNK_SIZE,
        'has the expected maximum chunk size'
      )

      const contentBytesForEntry = bytes.slice(
        currentOffset,
        currentOffset + entry.contentByteLength
      )
      const contentMultihashForEntry = await sha256.digest(contentBytesForEntry)
      assert.ok(
        equals(contentMultihashForEntry.bytes, entry.cid.multihash.bytes),
        'computed CID for entry matches expected multihash'
      )

      currentOffset += entry.contentByteLength
    }
    assert.equal(currentOffset, byteLength)
  })

  it('creates an unixfs filelink stream with custom settings', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    const MAX_CHUNK_SIZE_CUSTOM = (1024 * 1024) / 2
    /** @type {API.Block | undefined} */
    let rootBlock

    const { unixFsFileLinkReadable, unixFsReadable } = createUnixFsStreams(
      blob,
      {
        settings: {
          ...defaultSettings,
          chunker: withMaxChunkSize(MAX_CHUNK_SIZE_CUSTOM),
        },
      }
    )
    void (async () => {
      rootBlock = await readLast(unixFsReadable)
    })()
    const unixFsFileLinkEntries = await readAll(unixFsFileLinkReadable)

    // Validate root CID for unixFS
    const [rootFileLink] = unixFsFileLinkEntries.splice(
      unixFsFileLinkEntries.length - 1,
      1
    )
    assert.ok(rootFileLink)
    assert.equal(rootFileLink.cid.code, PB.code)
    assert.equal(rootFileLink.contentByteLength, byteLength)
    assert.ok(rootFileLink.dagByteLength > byteLength)
    assert.ok(!rootFileLink.contentByteOffset)

    // Check root block
    assert.ok(rootBlock)
    assert(rootBlock.cid.equals(rootFileLink.cid))

    assert.ok(unixFsFileLinkEntries.length)
    assert.equal(unixFsFileLinkEntries.length, 10)
    let currentOffset = 0
    for (const entry of unixFsFileLinkEntries) {
      assert.ok(entry, 'has entry')
      assert.equal(rootFileLink.cid.code, PB.code, 'has dag DAG PB code')
      assert.equal(
        entry.contentByteOffset,
        currentOffset,
        'has expected content byte offset'
      )
      assert.ok(
        entry.contentByteLength !== undefined,
        'has content byte length filled in'
      )
      assert.ok(
        entry.contentByteLength <= MAX_CHUNK_SIZE_CUSTOM,
        'has the expected maximum chunk size'
      )

      const contentBytesForEntry = bytes.slice(
        currentOffset,
        currentOffset + entry.contentByteLength
      )
      const contentMultihashForEntry = await sha256.digest(contentBytesForEntry)
      assert.ok(
        equals(contentMultihashForEntry.bytes, entry.cid.multihash.bytes),
        'computed CID for entry matches expected multihash'
      )

      currentOffset += entry.contentByteLength
    }
    assert.equal(currentOffset, byteLength)
  })

  it('writes unixfs file link index after processing blob', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    const location = '/bucket/file.bin'
    /** @type {API.Block | undefined} */
    let rootBlock

    const { unixFsFileLinkReadable, unixFsReadable } = createUnixFsStreams(blob)
    void (async () => {
      rootBlock = await readLast(unixFsReadable)
    })()
    const unixFsFileLinkEntries = await readAll(unixFsFileLinkReadable)

    const written = await writeUnixFsFileLinkIndex(
      blob,
      location,
      [singleLevelIndexWriter],
      packStore
    )

    assert.ok(written, 'index was written')
    assert.ok(written.containingMultihash, 'containing multihash was written')

    // Validate root CID for unixFS
    const [rootFileLink] = unixFsFileLinkEntries.splice(
      unixFsFileLinkEntries.length - 1,
      1
    )
    assert.ok(rootFileLink)
    assert.ok(
      equals(
        rootFileLink.cid.multihash.bytes,
        written.containingMultihash.bytes
      ),
      'containing multihash matches root file link'
    )
    // Check root block
    assert.ok(rootBlock)
    assert(rootBlock.cid.equals(rootFileLink.cid))

    const rootIndexRecords = await all(
      indexReader.findRecords(rootFileLink.cid.multihash)
    )
    assert.equal(rootIndexRecords.length, 1)
    const rootIndexRecord = rootIndexRecords[0]
    assert.ok(rootIndexRecord.offset === 0, 'has expected content byte offset')
    assert.ok(
      rootIndexRecord.length !== undefined,
      'has content byte length filled in'
    )
    assert.equal(
      rootIndexRecord.type,
      Type.BLOB,
      'has the expected record type'
    )

    assert.deepEqual(
      rootIndexRecord.subRecords,
      [],
      'has the expected sub records'
    )

    let currentOffset = 0
    for (const entry of unixFsFileLinkEntries) {
      const indexRecords = await all(
        indexReader.findRecords(entry.cid.multihash)
      )
      assert.equal(indexRecords.length, 1)
      const indexRecord = indexRecords[0]
      assert.equal(indexRecord.location, location)
      assert.ok(
        indexRecord.offset === currentOffset,
        'has expected content byte offset'
      )
      assert.ok(
        indexRecord.length !== undefined,
        'has content byte length filled in'
      )
      assert.ok(
        indexRecord.length <= MAX_CHUNK_SIZE,
        'has the expected maximum chunk size'
      )
      assert.equal(indexRecord.type, Type.BLOB, 'has the expected record type')

      assert.deepEqual(
        indexRecord.subRecords,
        [],
        'has the expected sub records'
      )

      const contentBytesForEntry = bytes.slice(
        currentOffset,
        currentOffset + indexRecord.length
      )
      const contentMultihashForEntry = await sha256.digest(contentBytesForEntry)
      assert.ok(
        equals(contentMultihashForEntry.bytes, indexRecord.multihash.bytes),
        'computed CID for entry matches expected multihash'
      )

      currentOffset += indexRecord.length
    }
  })

  it('streams raw content from pack store with unixfs file link indexed with single level writer', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    const location = '/bucket/file.bin'
    /** @type {API.Block | undefined} */
    let rootBlock

    // Store blob in set location
    await packStore.put(location, bytes)

    // Get entries to be able to see if index records were written
    const { unixFsFileLinkReadable, unixFsReadable } = createUnixFsStreams(blob)
    void (async () => {
      rootBlock = await readLast(unixFsReadable)
    })()
    const unixFsFileLinkEntries = await readAll(unixFsFileLinkReadable)

    assert.ok(rootBlock, 'root block was created')

    // Write index for unixfs file links
    await writeUnixFsFileLinkIndex(
      blob,
      location,
      [singleLevelIndexWriter],
      packStore
    )

    // Iterate entries and attempt to stream them.
    // Collect all verifiable blobs and compare with original bytes
    let concatedBlobBytes = new Uint8Array([])
    for (const entry of unixFsFileLinkEntries) {
      const verifiableBlobs = await all(
        hashStreamer.stream(entry.cid.multihash)
      )
      assert.equal(verifiableBlobs.length, 1)

      const verifiableBlob = verifiableBlobs[0]
      // If root CID, the butes should be different as it is a DAG PB
      // rather than the raw blob
      if (entry.cid.equals(rootBlock.cid)) {
        assert.notEqual(
          verifiableBlob.bytes.byteLength,
          entry.contentByteLength
        )
      } else {
        assert.equal(verifiableBlob.bytes.byteLength, entry.contentByteLength)

        // Check bytes
        assert.ok(
          equals(
            verifiableBlob.bytes,
            bytes.slice(
              entry.contentByteOffset,
              (entry.contentByteOffset || 0) + entry.contentByteLength
            )
          )
        )

        // Check multihash
        assert.ok(
          equals(verifiableBlob.multihash.bytes, entry.cid.multihash.bytes)
        )

        // Concatenate all bytes from entries except the root CID
        // @ts-expect-error
        concatedBlobBytes = concat([concatedBlobBytes, verifiableBlob.bytes])
      }
    }

    // Verify concatenated bytes they match the original bytes
    assert(
      equals(concatedBlobBytes, bytes),
      'concatenated bytes match original bytes'
    )
  })

  it('streams raw content from pack store with unixfs file link indexed with multiple level writer', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    const location = '/bucket/file.bin'
    /** @type {API.Block | undefined} */
    let rootBlock

    // Store blob in set location
    await packStore.put(location, bytes)

    // Get entries to be able to see if index records were written
    const { unixFsFileLinkReadable, unixFsReadable } = createUnixFsStreams(blob)
    void (async () => {
      rootBlock = await readLast(unixFsReadable)
    })()
    const unixFsFileLinkEntries = await readAll(unixFsFileLinkReadable)

    // Write index for unixfs file links
    const written = await writeUnixFsFileLinkIndex(
      blob,
      location,
      [multipleLevelIndexWriter],
      packStore
    )
    assert.ok(written, 'index was written')
    assert.ok(written.containingMultihash, 'containing multihash was written')
    assert.ok(rootBlock, 'root block was created')

    // Iterate entries and attempt to stream them
    for (const entry of unixFsFileLinkEntries) {
      // without containing multihash in multiple level writer
      // no verifiable blobs should be returned
      // unless is the containing multihash
      const verifiableBlobsWithoutContaining = await all(
        hashStreamer.stream(entry.cid.multihash)
      )
      // Only finds records without containing multihash
      // if the entry is the containing multihash itself
      if (
        equals(entry.cid.multihash.bytes, written.containingMultihash.bytes)
      ) {
        assert.equal(verifiableBlobsWithoutContaining.length, 6)

        const verifiableBlobsWithContaining = await all(
          hashStreamer.stream(entry.cid.multihash, {
            containingMultihash: written.containingMultihash,
          })
        )
        assert.equal(verifiableBlobsWithContaining.length, 1)
        assert(
          equals(verifiableBlobsWithContaining[0].bytes, rootBlock.bytes),
          'bytes match the root block bytes'
        )
        assert(
          equals(
            verifiableBlobsWithContaining[0].multihash.bytes,
            rootBlock.cid.multihash.bytes
          ),
          'multihash matches the entry multihash'
        )
      } else {
        // Not found verifiable blobs without containing multihash
        assert.equal(verifiableBlobsWithoutContaining.length, 0)

        const verifiableBlobsWithContaining = await all(
          hashStreamer.stream(entry.cid.multihash, {
            containingMultihash: written.containingMultihash,
          })
        )
        assert.equal(verifiableBlobsWithContaining.length, 1)
        const verifiableBlob = verifiableBlobsWithContaining[0]
        assert.equal(verifiableBlob.bytes.byteLength, entry.contentByteLength)

        // Check bytes
        assert.ok(
          equals(
            verifiableBlob.bytes,
            bytes.slice(
              entry.contentByteOffset,
              (entry.contentByteOffset || 0) + entry.contentByteLength
            )
          )
        )

        // Check multihash
        assert.ok(
          equals(verifiableBlob.multihash.bytes, entry.cid.multihash.bytes)
        )
      }
    }

    // Get Verifiable blobs for containing multihash
    const verifiableBlobs = await all(
      hashStreamer.stream(written.containingMultihash)
    )
    // 5 chunks for the file and 1 for the root block
    // which is the unixfs root block
    assert.equal(verifiableBlobs.length, 6)
    const fetchedBytes = getBytesFromChunckedBytes(
      // remove last blob with the unixfs root block
      verifiableBlobs
        .slice(0, verifiableBlobs.length - 1)
        .map((blob) => blob.bytes)
    )
    assert.equal(fetchedBytes.byteLength, byteLength)
    assert.ok(equals(fetchedBytes, bytes), 'fetched bytes match original bytes')
  })

  it('writes unixfs file link index after processing blob for multiple writers', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    const location = '/bucket/file.bin'
    /** @type {API.Block | undefined} */
    let rootBlock

    // Get entries to be able to see if index records were written
    const { unixFsFileLinkReadable, unixFsReadable } = createUnixFsStreams(blob)
    void (async () => {
      rootBlock = await readLast(unixFsReadable)
    })()
    const unixFsFileLinkEntries = await readAll(unixFsFileLinkReadable)
    assert.ok(rootBlock, 'root block was created')

    const written = await writeUnixFsFileLinkIndex(
      blob,
      location,
      [singleLevelIndexWriter, multipleLevelIndexWriter],
      packStore
    )

    assert.ok(written, 'index was written')
    assert.ok(written.containingMultihash, 'containing multihash was written')

    // Validate root CID for unixFS
    const [rootFileLink] = unixFsFileLinkEntries.splice(
      unixFsFileLinkEntries.length - 1,
      1
    )
    assert.ok(rootFileLink)
    assert.ok(
      equals(
        rootFileLink.cid.multihash.bytes,
        written.containingMultihash.bytes
      ),
      'containing multihash matches root file link'
    )
    const rootIndexRecords = await all(
      indexReader.findRecords(rootFileLink.cid.multihash)
    )
    assert.equal(rootIndexRecords.length, 2)

    const multipleLevelRootIndexRecord = rootIndexRecords.find(
      (record) => record.type === Type.CONTAINING
    )
    const singleLevelRootIndexRecord = rootIndexRecords.find(
      (record) => record.type === Type.BLOB
    )

    assert(multipleLevelRootIndexRecord)
    assert(singleLevelRootIndexRecord)

    assert.deepEqual(
      singleLevelRootIndexRecord.subRecords,
      [],
      'has the expected sub records'
    )
    assert.equal(multipleLevelRootIndexRecord.subRecords.length, 6)
  })

  it('handles empty index writers', async () => {
    const byteLength = 5_000_000
    const bytes = await randomBytes(byteLength)
    const blob = new Blob([bytes])
    const location = '/bucket/file.bin'

    // Store blob in set location
    await packStore.put(location, bytes)

    // Write index for unixfs file links
    assert.rejects(
      () => writeUnixFsFileLinkIndex(blob, location, [], packStore),
      {
        name: 'Error',
        message: 'No index writers provided',
      },
      'should throw error when no index writers are provided'
    )
  })
})

/**
 *
 * @param {Uint8Array[]} chunks
 */
function getBytesFromChunckedBytes(chunks) {
  const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const bytes = new Uint8Array(totalSize)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}

/**
 * Reads all chunks from a ReadableStream and returns them as an array.
 *
 * @template T
 * @param {ReadableStream<T>} stream
 * @returns {Promise<T[]>}
 */
async function readAll(stream) {
  const reader = stream.getReader()
  const chunks = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return chunks
}

/**
 * Reads all chunks from a ReadableStream and returns the last.
 *
 * @template T
 * @param {ReadableStream<T>} stream
 * @returns {Promise<T | undefined>}
 */
async function readLast(stream) {
  const reader = stream.getReader()
  let chunk
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunk = value
  }
  return chunk
}
