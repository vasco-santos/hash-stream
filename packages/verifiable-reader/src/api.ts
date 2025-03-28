import { MultihashDigest } from 'multiformats'

import { IndexReader } from '@hash-stream/index/types'
import { PackReader } from '@hash-stream/pack/types'

export type { IndexReader, PackReader, MultihashDigest }

export interface VerifiableReader {
  // Index lookup interface, as defined in the Index Specification
  indexReader: IndexReader

  // Pack retrieval interface, as defined in the Pack Specification
  packReader: PackReader

  // Retrieve a stream of verifiable blobs composing the target multihash
  stream(
    targetMultihash: MultihashDigest,
    // similar to https://github.com/ipfs/specs/pull/462
    options?: { containingMultihash?: MultihashDigest }
  ): AsyncIterable<VerifiableBlob>
}

export type VerifiableBlob = {
  multihash: MultihashDigest
  bytes: Uint8Array
}
