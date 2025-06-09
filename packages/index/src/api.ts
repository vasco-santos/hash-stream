import { MultihashDigest } from 'multiformats'

export type { MultihashDigest }

export interface Index extends IndexReader, IndexWriter {}

export interface IndexWriter {
  // Stores indexed entries
  store: IndexStore

  // Adds blob indexes associated with a pack, optionally with a containing Multihash that has a relationship with the Blobs.
  addBlobs(
    blobIndexIterable: AsyncIterable<BlobIndexRecord>,
    // in a multi-level-index this can be used with the contaning Multihash from where this pack belongs
    // similar to https://github.com/ipfs/specs/pull/462
    options?: { containingMultihash?: MultihashDigest }
  ): Promise<void>
}

// The index reader MUST support finding locations where given
// multihashes are stored
export interface IndexReader {
  // Stores indexed entries
  storeReader: IndexStoreReader

  // Find the index records related to the requested multihash
  findRecords(
    multihash: MultihashDigest,
    // in a multiple-level-index this can be used with the containing Multihash
    // similar to https://github.com/ipfs/specs/pull/462
    options?: { containingMultihash?: MultihashDigest }
  ): AsyncIterable<IndexRecord>
}

export interface IndexStore extends IndexStoreReader, IndexStoreWriter {}

export interface IndexStoreWriter {
  add(entries: AsyncIterable<IndexRecord>, recordType: string): Promise<void>
}

// Index records can be read from a given store based on the
// following Reader interface.
export interface IndexStoreReader {
  get(hash: MultihashDigest): AsyncIterable<IndexRecord>
}

// An index record has the necessary metadata to find the location
// where the bytes behind a given `MultihashDigest` rest.
export interface IndexRecord {
  // MultihashDigest identifiying the record
  multihash: MultihashDigest
  // Type of the record
  type: IndexRecordType
  // hash digest of the location or Path
  location: Location
  // length of the data
  length?: number
  // offset of the data in the location byte stream
  offset?: number
  // associated records
  subRecords: Array<IndexRecord>
}

export interface IndexRecordEncoded {
  // MultihashDigest identifiying the record
  multihash: Uint8Array
  // Type of the record
  type: IndexRecordType
  // hash digest of the location or Path
  location: Uint8Array | Path
  // length of the data
  length?: number
  // offset of the data in the location byte stream
  offset?: number
  // associated records
  subRecords: Array<IndexRecordEncoded>
}

// Represents an entry in the index, supporting multiple index types
export type IndexRecordEntry = { type: string; data: IndexRecordEncoded }

// Record Type Enum
export type IndexRecordType = BLOB | PACK | CONTAINING
type BLOB = 0
type PACK = 1
type CONTAINING = 2

export type Path = string

export type Location = MultihashDigest | Path

// Index record of where blob is
export interface BlobIndexRecord {
  // MultihashDigest identifiying the Blob
  multihash: MultihashDigest
  // hash digest of the location where the Blob is (Pack or Blob itself)
  location: Location
  // length of the data
  length: number
  // offset of the data in the location byte stream
  offset: number
}
