import assert from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'

// File Store
import { FSFileStore } from '../../src/file-store/fs.js'

const TEST_BYTES = new TextEncoder().encode('hello world')

describe('FSFileStore implementation specifics', () => {
  /** @type {FSFileStore} */
  let store
  /** @type {string} */
  let tempDir

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-index-store-'))
    store = new FSFileStore(tempDir)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('can list files in nested directories', async () => {
    const nestedKey = path.join('folder', 'nested.txt')
    const filePath = path.join(tempDir, nestedKey)
    const dirPath = path.dirname(filePath)
    fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, TEST_BYTES)

    const files = []
    for await (const file of store.list()) {
      files.push(file)
    }

    assert.strictEqual(files.length, 1)
    assert.strictEqual(files[0].key, nestedKey)
    assert.strictEqual(files[0].size, TEST_BYTES.length)
  })
})
