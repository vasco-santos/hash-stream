import { sha256 } from 'multiformats/hashes/sha2'

import { MemoryFileStore } from '../../src/file-store/memory.js'

export const getMemoryStore = async () => {
  const files = new Map()
  return Object.assign(new MemoryFileStore(files), {
    destroy: () => {},
    /**
     * @param {string} key
     * @param {Uint8Array} bytes
     */
    async put(key, bytes) {
      files.set(key, bytes)
    },
    /**
     * Retrieves bytes of a pack file by its multihash digest and streams it in specified ranges.
     *
     * @param {import('@hash-stream/pack/types').MultihashDigest | import('@hash-stream/pack/types').Path} target - The Multihash digest of the pack or its path.
     * @param {Array<{ offset?: number, length?: number, multihash: import('@hash-stream/pack/types').MultihashDigest }>} [ranges]
     * @returns {AsyncIterable<import('@hash-stream/pack/types').VerifiableEntry>}
     */
    async *stream(target, ranges = []) {
      if (typeof target !== 'string') {
        throw new Error('only string paths are supported for S3LikeFileStore')
      }

      const bytes = files.get(target)
      /* c8 ignore next 1 */
      if (!bytes) return

      if (ranges.length === 0) {
        let multihash
        if (typeof target === 'string') {
          // If target is a path, we need to calculate the hash
          multihash = await sha256.digest(bytes)
        }
        // If target is a multihash, we can use it directly
        else {
          multihash = target
        }
        yield { multihash, bytes }
        return
      }

      for (const { multihash, offset, length } of ranges) {
        const computedOffset = offset ?? 0
        /* c8 ignore next 1 */
        const slice = bytes.slice(
          computedOffset,
          length ? computedOffset + length : undefined
        )
        yield { multihash, bytes: slice }
      }
    },
  })
}
