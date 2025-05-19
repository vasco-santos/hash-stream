import { MultihashDigest } from 'multiformats'
import { UnixFSEncoderSettingsOptions } from '@web3-storage/upload-client/types'

export interface CreateUnixFsFileLikeStreamOptions
  extends UnixFSEncoderSettingsOptions {
  notIndexContaining?: boolean
}

export type { MultihashDigest }
