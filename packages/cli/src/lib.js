import os from 'os'
import fs from 'fs'
import path from 'path'

// Index
import { FSBlobIndexStore } from '@hash-stream/index/store/fs-blob'
import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'
import { SingleLevelIndex, MultipleLevelIndex } from '@hash-stream/index'

// Pack
import { FSPackStore } from '@hash-stream/pack/store/fs'
import { PackWriter } from '@hash-stream/pack'

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
 *
 * @param {object} [options]
 * @param {'single-level' | 'multiple-level' | 'none'} options.indexStrategy
 */
export async function getClient(options = { indexStrategy: 'multiple-level' }) {
  const store = getStore()
  let raw = await store.load()

  let agentData
  if (raw) {
    agentData = AgentData.fromExport(raw)
    // Verify if agentData is outdated
    let upgraded = false

    // Check pack
    if (!agentData.data.pack) {
      agentData.data.pack = {
        storeDir: path.join(os.homedir(), `.${getProfile()}`, 'pack'),
      }
      fs.mkdirSync(raw.pack.storeDir, { recursive: true })
      upgraded = true
    }

    if (upgraded) {
      await store.save(agentData.export())
    }
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
      pack: {
        storeDir: path.join(hashStreamDir, 'pack'),
      },
    }
    // Create directories
    fs.mkdirSync(raw.index.singleLevelIndex.storeDir, { recursive: true })
    fs.mkdirSync(raw.index.multipleLevelIndex.storeDir, { recursive: true })
    fs.mkdirSync(raw.pack.storeDir, { recursive: true })

    agentData = new AgentData(raw)
    await store.save(agentData.export())
  }

  // Get index based on strategy
  let indexStore, index

  if (options.indexStrategy === 'single-level') {
    indexStore = new FSBlobIndexStore(
      agentData.data.index.singleLevelIndex.storeDir
    )
    index = new SingleLevelIndex(indexStore)
  } else if (options.indexStrategy === 'multiple-level') {
    indexStore = new FSContainingIndexStore(
      agentData.data.index.multipleLevelIndex.storeDir
    )
    index = new MultipleLevelIndex(indexStore)
  }

  // Get pack store
  const packStore = new FSPackStore(agentData.data.pack.storeDir)
  const packWriter = new PackWriter(packStore, {
    indexWriter: index,
  })

  return {
    index: {
      store: indexStore,
      writer: index,
      reader: index,
    },
    pack: {
      store: packStore,
      writer: packWriter,
    },
  }
}
