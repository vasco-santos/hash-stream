import type { CID } from 'multiformats/cid'

export interface Block {
  cid: CID
  bytes: Uint8Array
}

export interface BlockHeader {
  cid: CID
  length: number
  blockLength: number
}

export interface BlockIndex extends BlockHeader {
  offset: number
  blockOffset: number
}
