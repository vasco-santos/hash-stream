import os from 'os'
import fs from 'fs'
import path from 'path'

import { FSBlockStore } from '@hash-stream/index/store/fs-block'
import { FSShardedDAG } from '@hash-stream/index/store/fs-sharded-dag'
import { BlockLevelIndex, MultipleLevelIndex } from '@hash-stream/index'

import { ConfDriver as StoreConf } from './conf/driver.js'
import { AgentData } from './conf/agent-data.js'

export const getProfile = () =>
  process.env.HASH_STREAM_STORE_NAME ?? 'hash-stream'

/** Get a configured w3up store used by the CLI. */
export function getStore() {
  return new StoreConf({
    profile: getProfile(),
  })
}

/**
 * Get a new hash-stream client configured from configuration.
 */
export async function getClient() {
  const store = getStore()
  let raw = await store.load()

  let agentData
  if (raw) {
    agentData = AgentData.fromExport(raw)
  } else {
    const hashStreamDir = path.join(os.homedir(), `.${getProfile()}`)
    raw = {
      index: {
        blockIndex: {
          storeDir: path.join(hashStreamDir, 'block-index'),
        },
        multipleLevelIndex: {
          storeDir: path.join(hashStreamDir, 'multiple-level-index'),
        },
      },
    }
    // Create directories
    fs.mkdirSync(raw.index.blockIndex.storeDir, { recursive: true })
    fs.mkdirSync(raw.index.multipleLevelIndex.storeDir, { recursive: true })

    agentData = new AgentData(raw)
    await store.save(agentData.export())
  }

  const blockIndexStore = new FSBlockStore(
    agentData.data.index.blockIndex.storeDir
  )
  const multipleLevelIndexStore = new FSShardedDAG(
    agentData.data.index.multipleLevelIndex.storeDir
  )
  const blockLevelIndex = new BlockLevelIndex(blockIndexStore)
  const multipleLevelIndex = new MultipleLevelIndex(multipleLevelIndexStore)

  return {
    index: {
      blockIndexStore,
      multipleLevelIndexStore,
      blockLevelIndex,
      multipleLevelIndex,
    },
  }
}
