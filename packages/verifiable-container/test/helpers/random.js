/* global crypto */
import { webcrypto } from '@storacha/one-webcrypto'

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
