import fs from 'fs'
import path from 'path'
import os from 'os'

import { FSPackStore } from '../src/store/fs.js'

import { runPackTests } from './pack.js'
;[
  {
    name: 'FS',
    /**
     * @returns {import('./pack.js').DestroyablePackStore}
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
].forEach(({ name, getPackStore }) => {
  runPackTests(name, () => getPackStore())
})
