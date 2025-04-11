import os from 'os'
import fs from 'fs'
import path from 'path'
import { S3Client } from '@aws-sdk/client-s3'

// Index
import { FSIndexStore } from '@hash-stream/index/store/fs'
import { S3LikeIndexStore } from '@hash-stream/index/store/s3-like'
import {
  SingleLevelIndexWriter,
  MultipleLevelIndexWriter,
  IndexReader,
} from '@hash-stream/index'

// Pack
import { FSPackStore } from '@hash-stream/pack/store/fs'
import { S3LikePackStore } from '@hash-stream/pack/store/s3-like'
import { PackWriter, PackReader } from '@hash-stream/pack'

// Streamer
import { HashStreamer } from '@hash-stream/streamer'

import { ConfDriver as StoreConf } from './conf/driver.js'
import { AgentData } from './conf/agent-data.js'

import { getS3ConfigFromEnv } from './utils.js'

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
 * @param {'single-level' | 'multiple-level' | 'all' | 'none'} options.indexWriterImplementationName
 * @param {'fs' | 's3'} options.storeBackend
 */
export async function getClient(
  options = {
    indexWriterImplementationName: 'multiple-level',
    storeBackend: 'fs',
  }
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
        storeDir: path.join(hashStreamDir, 'index'),
      },
      pack: {
        storeDir: path.join(hashStreamDir, 'pack'),
      },
    }
    // Create directories
    fs.mkdirSync(raw.index.storeDir, { recursive: true })
    fs.mkdirSync(raw.pack.storeDir, { recursive: true })

    agentData = new AgentData(raw)
    await store.save(agentData.export())
  }

  // Get stores based on backend
  let indexStore, packStore
  if (options.storeBackend === 's3') {
    const s3Config = getS3ConfigFromEnv()
    const indexS3Client = new S3Client({
      endpoint: s3Config.endpoint,
      forcePathStyle: true,
      region: s3Config.region,
      credentials: s3Config.credentials,
    })
    indexStore = new S3LikeIndexStore({
      bucketName: s3Config.indexBucket,
      prefix: s3Config.indexPrefix,
      client: indexS3Client,
    })
    const packS3Client = new S3Client({
      endpoint: s3Config.endpoint,
      forcePathStyle: true,
      region: s3Config.region,
      credentials: s3Config.credentials,
    })
    packStore = new S3LikePackStore({
      bucketName: s3Config.packBucket,
      prefix: s3Config.packPrefix,
      client: packS3Client,
    })
  } else {
    indexStore = new FSIndexStore(agentData.data.index.storeDir)
    packStore = new FSPackStore(agentData.data.pack.storeDir)
  }

  // Get index based on strategy
  let indexWriters = []
  let indexReader
  if (options.indexWriterImplementationName === 'single-level') {
    indexWriters.push(new SingleLevelIndexWriter(indexStore))
  } else if (options.indexWriterImplementationName === 'multiple-level') {
    indexWriters.push(new MultipleLevelIndexWriter(indexStore))
  } else if (options.indexWriterImplementationName === 'all') {
    indexWriters.push(new SingleLevelIndexWriter(indexStore))
    indexWriters.push(new MultipleLevelIndexWriter(indexStore))
  }
  indexReader = new IndexReader(indexStore)

  // Get pack store
  const packWriter = new PackWriter(packStore, {
    indexWriters,
  })
  const packReader = new PackReader(packStore)

  return {
    index: {
      store: indexStore,
      writers: indexWriters,
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
