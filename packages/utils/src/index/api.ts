import { MultihashDigest } from 'multiformats'
import { UnixFSEncoderSettingsOptions } from '@web3-storage/upload-client/types'
import { FileLink, Block } from '@vascosantos/unixfs'

export interface CreateUnixFsFileLikeStreamOptions
  extends UnixFSEncoderSettingsOptions {
  notIndexContaining?: boolean
}

export interface UnixFsStreams {
  unixFsFileLinkReadable: ReadableStream<FileLink>
  unixFsReadable: ReadableStream<Block>
}

export type { MultihashDigest, FileLink, Block }
