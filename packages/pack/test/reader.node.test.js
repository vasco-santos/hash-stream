import fs from 'fs'
import path from 'path'
import os from 'os'

import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'
import { FSPackStore } from '../src/store/fs.js'

import { runPackReaderTests } from './reader.js'
;[
  {
    name: 'FS',
    /**
     * @returns {import('./reader.js').DestroyablePackStore}
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
    /**
     * @returns {import('./reader.js').DestroyableIndexStore}
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
  },
].forEach(({ name, getPackStore, getIndexStore }) => {
  runPackReaderTests(
    name,
    () => getPackStore(),
    () => getIndexStore()
  )
})
