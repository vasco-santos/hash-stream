import fs from 'fs'
import os from 'os'
import path from 'path'

import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'
import { FSPackStore } from '@hash-stream/pack/store/fs'
import { runHashStreamTests } from './hash-streamer.js'
;[
  {
    name: 'FS',
    /**
     * @returns {import('./hash-streamer.js').DestroyableIndexStore}
     */
    getIndexStore: () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-index-test-'))
      const indexStore = new FSContainingIndexStore(tempDir)
      const destroyableIndexStore = Object.assign(indexStore, {
        destroy: () => {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
          }
        },
      })
      return destroyableIndexStore
    },
    /**
     * @returns {import('./hash-streamer.js').DestroyablePackStore}
     */
    getPackStore: () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-pack-test-'))
      const packStore = new FSPackStore(tempDir)
      const destroyablePackStore = Object.assign(packStore, {
        destroy: () => {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
          }
        },
      })
      return destroyablePackStore
    },
  },
].forEach(({ name, getIndexStore, getPackStore }) => {
  runHashStreamTests(
    name,
    () => getIndexStore(),
    () => getPackStore()
  )
})
