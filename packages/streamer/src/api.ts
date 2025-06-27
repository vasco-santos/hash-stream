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
    options?: HashStreamerStreamOptions
  ): AsyncIterable<VerifiableBlob>
}

export interface HashStreamerStreamOptions {
  // similar to https://github.com/ipfs/specs/pull/462
  containingMultihash?: MultihashDigest

  // callback for each index record found
  // useful for debugging or logging purposes
  onIndexRecord?: (indexRecord: IndexRecord) => void

  // callback for each pack record found
  // useful for debugging or logging purposes
  // this is called for each pack record read from the index record
  // and can be used to track the retrieval of blobs
  onPackRead?: (multihash: MultihashDigest) => void
}

export type LocationRecord = {
  length: number
  offset: number
  multihash: MultihashDigest
}

export type LocationType = LOCATION_MULTIHASH | LOCATION_PATH

type LOCATION_MULTIHASH = 0
type LOCATION_PATH = 1

export type VerifiableBlob = {
  multihash: MultihashDigest
  bytes: Uint8Array
  type: VerifiableBlobType
}

export type VerifiableBlobType = PLAIN

type PLAIN = 0
