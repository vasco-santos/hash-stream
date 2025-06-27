import { HashStreamerStreamOptions } from '@hash-stream/streamer/types'

export type ResponseOptions = {
  fileName?: string
}

export type CarParams = {
  version: 1 | 2
  order?: 'dfs' | 'unk'
  dups: boolean
}

export type CarResponseOptions = ResponseOptions & CarParams

export interface IpfsGetOptions extends HashStreamerStreamOptions {}
