import * as API from './api.js'

import { sha256 } from 'multiformats/hashes/sha2'
import { ShardingStream } from '@web3-storage/upload-client'
import { createFileEncoderStream } from '@web3-storage/upload-client/unixfs'

import { PackWriter } from './writer.js'
import { PackReader } from './reader.js'

export { PackWriter, PackReader }

/**
 * Create a set of packs from a blob.
 *
 * @param {import('@web3-storage/upload-client/types').BlobLike} blob
 * @param {API.CreateOptions} [options]
 */
export function createPacks(blob, options) {
  if (options?.type === 'car') {
    return createCars(blob, options)
  }
  throw new Error('only CAR packs are supported')
}

/**
 * Creates a generator that yields CAR packs asynchronously and provides a promise for the root CID.
 *
 * @param {import('./api.js').BlobLike} blob - The input file-like object containing a ReadableStream.
 * @param {import('./api.js').CreateCarPackOptions} [options] - Optional settings.
 * @returns {{
 *   packStream: AsyncGenerator<API.VerifiableEntry, void, void>,
 *   containingPromise: Promise<API.MultihashDigest>
 * }} - An object containing the generator and a promise for the root CID.
 */
function createCars(blob, options) {
  const hasher = options?.hasher || sha256

  /** @type {(containingPromise: API.MultihashDigest) => void} */
  let resolveContaining
  const containingPromise = Object.assign(
    new Promise((resolve) => {
      resolveContaining = resolve
    }),
    { _resolved: false }
  )

  async function* carPackGenerator() {
    for await (const pack of generateIndexedCars(blob, options)) {
      const bytes = new Uint8Array(await pack.arrayBuffer())
      const multihash = await hasher.digest(bytes)
      const verifiablePack = { bytes, multihash }

      // Capture root CID when found
      if (!containingPromise._resolved && pack.roots.length > 0) {
        resolveContaining(pack.roots[0].multihash)
        containingPromise._resolved = true // Prevent multiple resolutions
      }

      yield verifiablePack
    }
  }

  return {
    packStream: carPackGenerator(),
    containingPromise,
  }
}

/**
 * Reads a BlobLike object and yields CAR files asynchronously.
 *
 * @param {import('./api.js').BlobLike} blob - The input file-like object containing a ReadableStream.
 * @param {import('./api.js').GenerateIndexedCarsOptions} [options] - Optional settings.
 * @returns {AsyncGenerator<import('./api.js').IndexedCARFile, void, void>} - An async generator that yields CAR files.
 */
async function* generateIndexedCars(blob, options) {
  // Step 1: Create a UnixFS encoder stream from the BlobLike input
  const unixFsStream = createFileEncoderStream(blob, options)

  // Step 2: Create a sharding stream to produce CAR files
  const shardingStream = new ShardingStream(options)

  // Step 3: Pipe UnixFS blocks into the sharding stream
  const reader = unixFsStream.pipeThrough(shardingStream).getReader()

  // Step 4: Read from the stream and yield CAR files
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      yield value // Yield each CAR file
    }
  } finally {
    reader.releaseLock() // Ensure stream resources are released
  }
}
