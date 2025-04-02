import assert from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { equals } from 'uint8arrays/equals'
import all from 'it-all'

import { recursive as exporter } from 'ipfs-unixfs-exporter'
import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { CarReader } from '@ipld/car'
import { CarIndexer } from '@ipld/car'
import { createPacks } from '@hash-stream/pack'

import { randomCID, randomBytes } from './helpers/random.js'
import { createEnv } from './helpers/env.js'
import * as Command from './helpers/process.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const binPath = join(__dirname, '../src/bin.js')
const hashStreamCmd = Command.create(binPath)
const env = createEnv()

const byteLength = 10_000_000
const dagPbCode = 0x70

describe('CLI streamer', () => {
  /** @type {string} */
  let tempDir
  /** @type {Uint8Array} */
  let bytes
  /** @type {string} */
  let testFilePath

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-streamer-test-'))
    bytes = await randomBytes(byteLength)
    testFilePath = path.join(tempDir, 'random.txt')
    fs.writeFileSync(testFilePath, bytes)
  })

  after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('stream dumps a single blob indexed within a pack', async () => {
    const shardSize = byteLength / 2
    // Write generated bytes as packs
    const { status: packWriteStatus } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--pack-size', `${shardSize}`])
      .env(env)
      .join()

    assert.equal(packWriteStatus.code, 0)

    // Get Packs and blob multihashes for attempting streamer
    const { containingMultihash, blobsMultihashes } = await inspectCreatedPacks(
      bytes,
      shardSize
    )

    // Streamer dump
    const targetCid = CID.createV1(RawCode, blobsMultihashes[0])
    const containingCid = CID.createV1(dagPbCode, containingMultihash)
    const writePath = path.join(tempDir, `${targetCid}.car`)
    const { output, status } = await hashStreamCmd
      .env(env)
      .args([
        'streamer',
        'dump',
        targetCid.toString(),
        writePath,
        containingCid.toString(),
      ])
      .env(env)
      .join()

    assert.equal(status.code, 0)
    assert.match(
      output,
      /Target CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+Containing CID:\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+Successfully wrote baf[a-z0-9]+ bytes to .+\.car\n?/
    )

    // Verify the dumped file bytes match the target multihash requested
    const dumpedBytes = await fs.promises.readFile(writePath)

    const carReader = await CarReader.fromBytes(dumpedBytes)
    const storedBlob = await carReader.get(targetCid)

    const computedHash = await sha256.digest(storedBlob.bytes)
    assert(equals(targetCid.multihash.bytes, computedHash.bytes))
  })

  it('stream dumps a pack indexed within a containing', async () => {
    const shardSize = byteLength / 2
    // Write generated bytes as packs
    const { status: packWriteStatus } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--pack-size', `${shardSize}`])
      .env(env)
      .join()

    assert.equal(packWriteStatus.code, 0)

    // Get Packs and blob multihashes for attempting streamer
    const { containingMultihash, packsMultihashes } = await inspectCreatedPacks(
      bytes,
      shardSize
    )

    // Streamer dump
    const targetCid = CID.createV1(RawCode, packsMultihashes[0])
    const containingCid = CID.createV1(dagPbCode, containingMultihash)
    const writePath = path.join(tempDir, `${targetCid}.car`)
    const { output, status } = await hashStreamCmd
      .env(env)
      .args([
        'streamer',
        'dump',
        targetCid.toString(),
        writePath,
        containingCid.toString(),
      ])
      .env(env)
      .join()

    assert.equal(status.code, 0)
    assert.match(
      output,
      /Target CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+Containing CID:\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+Successfully wrote baf[a-z0-9]+ bytes to .+\.car\n?/
    )

    // Check hash of written content
    const dumpedBytes = await fs.promises.readFile(writePath)
    const computedHash = await sha256.digest(dumpedBytes)
    assert(equals(targetCid.multihash.bytes, computedHash.bytes))
  })

  it('stream dumps containing', async () => {
    const shardSize = byteLength / 2
    // Write generated bytes as packs
    const { status: packWriteStatus } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--pack-size', `${shardSize}`])
      .env(env)
      .join()

    assert.equal(packWriteStatus.code, 0)

    // Get Packs and blob multihashes for attempting streamer
    const { containingMultihash } = await inspectCreatedPacks(bytes, shardSize)

    // Streamer dump
    const containingCid = CID.createV1(dagPbCode, containingMultihash)
    const writePath = path.join(tempDir, `${containingCid}.car`)
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['streamer', 'dump', containingCid.toString(), writePath])
      .env(env)
      .join()

    assert.equal(status.code, 0)

    assert.match(
      output,
      /Target CID:\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\nSuccessfully wrote bafy[a-z0-9]+ bytes to .+\.car\n?/
    )

    // Verify the dumped contain file unpacked bytes match the written file
    const unpackData = await unpack(writePath, containingCid)
    assert(equals(unpackData, bytes))
  })

  it('stream dump notices that there were no items found', async () => {
    // Streamer dump
    const targetCid = await randomCID()
    const writePath = path.join(tempDir, `${targetCid}.car`)
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['streamer', 'dump', targetCid.toString(), writePath])
      .env(env)
      .join()

    assert.equal(status.code, 0)
    assert.match(
      output,
      /Target CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\nNo entries for baf[a-z0-9]+ were found\n?/
    )

    // Verify the dumped file was not written
    assert.rejects(
      async () => {
        await fs.promises.readFile(writePath)
      },
      {
        code: 'ENOENT',
      }
    )
  })
})

/**
 * @param {string} path
 * @param {CID} targetCid
 */
async function unpack(path, targetCid) {
  const dumpedBytes = await fs.promises.readFile(path)
  const readerBlockStore = await CarReader.fromBytes(dumpedBytes)

  // Reconstruct blob with unixfs exporter
  const entries = exporter(targetCid, {
    async get(cid) {
      let block = await readerBlockStore.get(cid)
      if (!block) {
        // fallback to try to get block with raw CID
        const rawCid = CID.createV1(RawCode, cid.multihash)
        block = await readerBlockStore.get(rawCid)
        if (!block) {
          throw new Error(`Block not found in exported content: ${cid}`)
        }
      }
      return block.bytes
    },
  })

  const fileEntries = await all(entries)
  assert(fileEntries.length === 1)
  const file = fileEntries[0]
  const collectedFileChunks = await all(file.content())
  return getBytesFromChunckedBytes(collectedFileChunks)
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

/**
 * @param {Uint8Array} bytes
 * @param {number} shardSize
 */
async function inspectCreatedPacks(bytes, shardSize) {
  const blob = new Blob([bytes])

  /** @typedef {import('@hash-stream/pack/types').CreateOptions} */
  const createPackOptions = {
    shardSize,
    type: /** @type {'car'} */ ('car'),
  }

  const { packStream, containingPromise } = createPacks(blob, createPackOptions)

  const packsMultihashes = []
  const blobsMultihashes = []

  for await (const { multihash, bytes } of packStream) {
    const blobIterable = await CarIndexer.fromBytes(bytes)
    for await (const blob of blobIterable) {
      blobsMultihashes.push(blob.cid.multihash)
    }
    packsMultihashes.push(multihash)
  }

  const containingMultihash = await containingPromise

  return {
    containingMultihash,
    packsMultihashes,
    blobsMultihashes,
  }
}
