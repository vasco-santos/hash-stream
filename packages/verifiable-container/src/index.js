import * as API from './api.js'

import { sha256 } from 'multiformats/hashes/sha2'
import { ShardingStream } from '@web3-storage/upload-client'
import { createFileEncoderStream } from '@web3-storage/upload-client/unixfs'

/**
 * Create a set of verifiable container from a blob and store them.
 *
 * @param {import('@web3-storage/upload-client/types').BlobLike} blob
 * @param {API.ContainerStore} store
 * @param {API.CreateOptions} [options]
 */
export function createAndStore(blob, store, options) {
  if (options?.type === 'car') {
    return createAndStoreCars(blob, store, options)
  }
  throw new Error('only CAR containers are supported')
}

/**
 * Create a set of verifiable container CARs from a blob and store them.
 *
 * @param {import('@web3-storage/upload-client/types').BlobLike} blob
 * @param {API.ContainerStore} store
 * @param {API.CreateOptions} [options]
 */
async function createAndStoreCars(blob, store, options) {
  const { stream, root } = createCars(blob, options)

  const containersMultihash = []
  for await (const container of stream) {
    containersMultihash.push(container.multihash)
    await store.put(container.multihash, container.bytes)
  }

  const rootCid = await root
  return { rootCid, containersMultihash }
}

/**
 * Create a set of verifiable container from a blob.
 *
 * @param {import('@web3-storage/upload-client/types').BlobLike} blob
 * @param {API.CreateOptions} [options]
 */
export function create(blob, options) {
  if (options?.type === 'car') {
    return createCars(blob, options)
  }
  throw new Error('only CAR containers are supported')
}

/**
 * Creates a generator that yields CAR containers asynchronously and provides a promise for the root CID.
 *
 * @param {import('./api.js').BlobLike} blob - The input file-like object containing a ReadableStream.
 * @param {import('./api.js').CreateCarContainerOptions} [options] - Optional settings.
 * @returns {{
 *   stream: AsyncGenerator<import('./api.js').VerifiableCarContainer, void, void>,
 *   root: Promise<import('./api.js').UnknownLink>
 * }} - An object containing the generator and a promise for the root CID.
 */
function createCars(blob, options) {
  const hasher = options?.hasher || sha256

  /** @type {(cid: import('./api.js').UnknownLink) => void} */
  let resolveRoot
  const rootPromise = Object.assign(
    new Promise((resolve) => {
      resolveRoot = resolve
    }),
    { _resolved: false }
  )

  async function* carContainerGenerator() {
    for await (const car of generateIndexedCars(blob, options)) {
      const bytes = new Uint8Array(await car.arrayBuffer())
      const multihash = await hasher.digest(bytes)
      const container = { car, bytes, multihash }

      // Capture root CID when found
      if (!rootPromise._resolved && car.roots.length > 0) {
        resolveRoot(car.roots[0])
        rootPromise._resolved = true // Prevent multiple resolutions
      }

      yield container
    }
  }

  return { stream: carContainerGenerator(), root: rootPromise }
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
