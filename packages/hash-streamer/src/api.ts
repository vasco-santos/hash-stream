import { MultihashDigest } from 'multiformats'

import { IndexReader, IndexRecord } from '@hash-stream/index/types'
import { PackReader } from '@hash-stream/pack/types'

export type { IndexReader, IndexRecord, PackReader, MultihashDigest }

export interface HashStreamer {
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

export type PackLocation = {
  length: number
  offset: number
  multihash: MultihashDigest
}

export type VerifiableBlob = {
  multihash: MultihashDigest
  bytes: Uint8Array
  type: VerifiableBlobType
}

export type VerifiableBlobType = PLAIN

type PLAIN = 0
