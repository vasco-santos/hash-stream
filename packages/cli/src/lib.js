import os from 'os'
import fs from 'fs'
import path from 'path'

import { FSBlobIndexStore } from '@hash-stream/index/store/fs-blob'
import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'
import { SingleLevelIndex, MultipleLevelIndex } from '@hash-stream/index'

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
        singleLevelIndex: {
          storeDir: path.join(hashStreamDir, 'single-level-index'),
        },
        multipleLevelIndex: {
          storeDir: path.join(hashStreamDir, 'multiple-level-index'),
        },
      },
    }
    // Create directories
    fs.mkdirSync(raw.index.singleLevelIndex.storeDir, { recursive: true })
    fs.mkdirSync(raw.index.multipleLevelIndex.storeDir, { recursive: true })

    agentData = new AgentData(raw)
    await store.save(agentData.export())
  }

  const singleLevelIndexStore = new FSBlobIndexStore(
    agentData.data.index.singleLevelIndex.storeDir
  )
  const multipleLevelIndexStore = new FSContainingIndexStore(
    agentData.data.index.multipleLevelIndex.storeDir
  )
  const singleLevelIndex = new SingleLevelIndex(singleLevelIndexStore)
  const multipleLevelIndex = new MultipleLevelIndex(multipleLevelIndexStore)

  return {
    index: {
      singleLevelIndexStore,
      multipleLevelIndexStore,
      singleLevelIndex,
      multipleLevelIndex,
    },
  }
}
