/* global crypto */
import { webcrypto } from '@storacha/one-webcrypto'
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'

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
 * @returns {Promise<CID>}
 */
export async function randomCID() {
  const bytes = await randomBytes(10)
  const hash = await sha256.digest(bytes)
  return CID.create(1, raw.code, hash)
}
