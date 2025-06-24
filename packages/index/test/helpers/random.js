/* global crypto */
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'
import * as Link from 'multiformats/link'
import { configure } from '@ipld/unixfs'
import { withMaxChunkSize } from '@ipld/unixfs/file/chunker/fixed'
import { webcrypto } from '@storacha/one-webcrypto'
import { createFileEncoderStream, CAREncoderStream } from 'ipfs-car'

/**
 * @param {number} size
 */
export async function randomBytes(size) {
  const bytes = new Uint8Array(size)
  while (size) {
    const chunk = new Uint8Array(Math.min(size, 65_536))
    webcrypto.getRandomValues(chunk)

    size -= chunk.length
    bytes.set(chunk, size)
  }
  return bytes
}

/**
 * @param {number} size
 * @param {object} [options]
 * @param {number} [options.chunkSize]
 */
export async function randomCAR(size, { chunkSize = 10_000 } = {}) {
  const bytes = await randomBytes(size)
  const input = createFileEncoderStream(
    new Blob([bytes]),
    configure({
      chunker: withMaxChunkSize(chunkSize),
      fileChunkEncoder: raw,
    })
  )
  const encoder = new CAREncoderStream()

  // @ts-ignore
  const carParts = []
  await input.pipeThrough(encoder).pipeTo(
    new WritableStream({
      write: (part) => {
        carParts.push(part)
      },
    })
  )

  const root = encoder.finalBlock?.cid

  // @ts-ignore
  const blob = new Blob(carParts)
  const data = new Uint8Array(await blob.arrayBuffer())
  const digest = await sha256.digest(data)
  const cid = CID.create(1, CarCode, digest)

  return Object.assign(blob, { cid, roots: [root] })
}

/** @param {number} size */
export async function randomBlob(size) {
  const bytes = await randomBytes(size)
  const multihash = await sha256.digest(bytes)
  const digest = multihash.bytes
  const blobSize = bytes.byteLength
  const cid = Link.create(raw.code, multihash)

  return { digest, size: blobSize, cid }
}

/**
 * @param {object} options
 * @param {Uint8Array} [options.bytes] - Bytes to use for the CID, if not provided a random 10 byte value will be used.
 * @returns {Promise<CID>} A CID with a raw codec and sha256 hash.
 */
export async function randomCID(options = {}) {
  let bytes = options.bytes
  if (!bytes) {
    bytes = await randomBytes(10)
  }
  const hash = await sha256.digest(bytes)
  return CID.create(1, raw.code, hash)
}

// eslint-disable-next-line
export const CarCode = 0x0202
