import { UnknownLink, MultihashDigest, MultihashHasher } from 'multiformats'
import {
  BlobLike,
  ShardingOptions,
  UnixFSEncoderSettingsOptions,
  IndexedCARFile,
  CARMetadata,
} from '@web3-storage/upload-client/types'

export type {
  UnknownLink,
  MultihashDigest,
  BlobLike,
  IndexedCARFile,
  CARMetadata,
}

export interface GenerateIndexedCarsOptions
  extends ShardingOptions,
    UnixFSEncoderSettingsOptions {}

export interface CreateCarContainerOptions extends GenerateIndexedCarsOptions {
  hasher?: MultihashHasher
}

export interface CreateOptions extends CreateCarContainerOptions {
  /**
   * Verifiable container type
   */
  type: 'car'
}

export interface ContainerStore {
  /**
   * Stores a container file.
   *
   * @param hash - The Multihash digest of the container.
   * @param data - The container file bytes.
   * @returns A promise that resolves when the container file is stored.
   */
  put(hash: MultihashDigest, data: Uint8Array): Promise<void>

  /**
   * Retrieves bytes of a container file by its multihash digest.
   *
   * @param hash - The Multihash digest of the container.
   * @returns A promise that resolves with the container file data or null if not found.
   */
  get(hash: MultihashDigest): Promise<Uint8Array | null>
}

export interface VerifiableCarContainer {
  car: IndexedCARFile
  bytes: Uint8Array
  multihash: MultihashDigest
}
