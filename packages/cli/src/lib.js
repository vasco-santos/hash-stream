import os from 'os'
import fs from 'fs'
import path from 'path'

// Index
import { FSIndexStore } from '@hash-stream/index/store/fs'
import {
  SingleLevelIndexWriter,
  MultipleLevelIndexWriter,
  IndexReader,
} from '@hash-stream/index'

// Pack
import { FSPackStore } from '@hash-stream/pack/store/fs'
import { PackWriter, PackReader } from '@hash-stream/pack'

// Streamer
import { HashStreamer } from '@hash-stream/streamer'

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
 * @param {'single-level' | 'multiple-level' | 'none'} options.indexWriterImplementationName
 */
export async function getClient(
  options = { indexWriterImplementationName: 'multiple-level' }
) {
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
  let indexStore, indexWriter, indexReader

  if (options.indexWriterImplementationName === 'single-level') {
    indexStore = new FSIndexStore(
      agentData.data.index.singleLevelIndex.storeDir
    )
    indexWriter = new SingleLevelIndexWriter(indexStore)
    indexReader = new IndexReader(indexStore)
  } else if (options.indexWriterImplementationName === 'multiple-level') {
    indexStore = new FSIndexStore(
      agentData.data.index.multipleLevelIndex.storeDir
    )
    indexWriter = new MultipleLevelIndexWriter(indexStore)
    indexReader = new IndexReader(indexStore)
  }

  // Get pack store
  const packStore = new FSPackStore(agentData.data.pack.storeDir)
  const packWriter = new PackWriter(packStore, {
    indexWriter,
  })
  const packReader = new PackReader(packStore)

  return {
    index: {
      store: indexStore,
      writer: indexWriter,
      reader: indexReader,
    },
    pack: {
      store: packStore,
      writer: packWriter,
      reader: packReader,
    },
    streamer: indexReader && new HashStreamer(indexReader, packReader),
  }
}
