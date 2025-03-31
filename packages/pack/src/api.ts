import { UnknownLink, MultihashDigest, MultihashHasher } from 'multiformats'
import {
  BlobLike,
  ShardingOptions,
  UnixFSEncoderSettingsOptions,
  IndexedCARFile,
  CARMetadata,
} from '@web3-storage/upload-client/types'
import { IndexWriter, IndexStore } from '@hash-stream/index/types'

export type {
  UnknownLink,
  MultihashDigest,
  BlobLike,
  IndexedCARFile,
  CARMetadata,
  IndexWriter,
  IndexStore,
}

export interface PackReader {
  storeReader: PackStoreReader

  /**
   * Stream data from a Pack, optionally requesting specific byte ranges.
   *
   * @param {MultihashDigest} targetMultihash - The multihash of the Pack to retrieve.
   * @param {Array<{ offset: number, length?: number, multihash: MultihashDigest }>} [ranges] -
   *        Optional ranges specifying which parts of the Pack should be streamed.
   *        If omitted, the entire Pack is streamed.
   * @returns {AsyncIterable<VerifiableEntry>}
   */
  stream(
    targetMultihash: MultihashDigest,
    ranges?: Array<{
      offset: number
      length: number
      multihash: MultihashDigest
    }>
  ): AsyncIterable<VerifiableEntry>
}

export interface PackWriter {
  storeWriter: PackStoreWriter
  indexWriter?: IndexWriter

  write(
    blobLike: BlobLike,
    options: PackWriterWriteOptions
  ): Promise<{
    containingMultihash: MultihashDigest
    packsMultihashes: MultihashDigest[]
  }>
}

export interface PackWriterWriteOptions extends CreateOptions {
  notIndexContaining?: boolean
  onPackWrite?: (
    packMultihash: MultihashDigest,
    blobMultihashes: MultihashDigest[]
  ) => void
}

export interface GenerateIndexedCarsOptions
  extends ShardingOptions,
    UnixFSEncoderSettingsOptions {}

export interface CreateCarPackOptions extends GenerateIndexedCarsOptions {
  hasher?: MultihashHasher
}

export interface CreateOptions extends CreateCarPackOptions {
  /**
   * Pack type
   */
  type: 'car'
}

export interface PackStore extends PackStoreWriter, PackStoreReader {}

export interface PackStoreWriter {
  /**
   * Stores a pack file.
   *
   * @param hash - The Multihash digest of the pack.
   * @param data - The pack file bytes.
   * @returns A promise that resolves when the pack file is stored.
   */
  put(hash: MultihashDigest, data: Uint8Array): Promise<void>
}

export interface PackStoreReader {
  /**
   * Retrieves bytes of a pack file by its multihash digest.
   *
   * @param hash - The Multihash digest of the pack.
   * @returns A promise that resolves with the pack file data or null if not found.
   */
  get(hash: MultihashDigest): Promise<Uint8Array | null>

  stream(
    targetMultihash: MultihashDigest,
    ranges?: Array<{
      offset?: number
      length?: number
      multihash: MultihashDigest
    }>
  ): AsyncIterable<VerifiableEntry>
}

export interface VerifiableEntry {
  bytes: Uint8Array
  multihash: MultihashDigest
  offset?: number
  length?: number
}
