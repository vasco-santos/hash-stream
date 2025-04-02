import assert from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { randomBytes } from './helpers/random.js'
import { createEnv } from './helpers/env.js'
import * as Command from './helpers/process.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const binPath = join(__dirname, '../src/bin.js')
const hashStreamCmd = Command.create(binPath)
const env = createEnv()

const byteLength = 10_000_000

describe('CLI pack', () => {
  /** @type {string} */
  let tempDir
  /** @type {string} */
  let testFilePath

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-pack-test-'))
    const bytes = await randomBytes(byteLength)
    testFilePath = path.join(tempDir, 'random.txt')
    fs.writeFileSync(testFilePath, bytes)
  })

  after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('pack write a file', async () => {
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath])
      .env(env)
      .join()

    assert.equal(status.code, 0)

    assert.match(
      output,
      /Packing file: .*\/random\.txt\s*\n\s*Pack Max Size: 133169152\s*\n\s*Index Writer: multiple-level\s*\n\s*Containing CID:\s*\n\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n\s*Packs:\s*\n(?:\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n\s*Blobs:\s*\n(?:\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n*)+)/
    )
  })

  it('pack write a file with index disabled', async () => {
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--index-writer', 'none'])
      .env(env)
      .join()

    assert.equal(status.code, 0)

    assert.match(
      output,
      /Packing file: .*\/random\.txt\s*\n\s*Pack Max Size: \d+\s*\n\s*Index Writer: none\s*\n\s*Containing CID:\s*\n\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n\s*Packs:\s*\n(?:\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n\s*Blobs:\s*\n(?:\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n*)+)/
    )
  })

  it('pack write a file with custom max size', async () => {
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--pack-size', `${byteLength / 2}`])
      .env(env)
      .join()

    assert.equal(status.code, 0)
    assert.match(
      output,
      /\n*Packing file: .*\/random\.txt\n\s+Pack Max Size: 5000000\n+\s*Index Writer: multiple-level\n\s*Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Packs:\n+(?:\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Blobs:\n(?:\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+)+)+/
    )
  })

  it('pack write fails if type is not car', async () => {
    const fail = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--type', 'zip'])
      .env(env)
      .join()
      .catch()

    assert.match(
      fail.error,
      /Error: Invalid type "zip". Only "car" is supported.\n/
    )
  })

  it('pack read a file after write', async () => {
    const { output: writeOutput, status: writeStatus } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--index-writer', 'none'])
      .env(env)
      .join()

    assert.equal(writeStatus.code, 0)

    const regex = /Packs:\s*\n\s*(baf[a-z0-9]+)/
    const match = writeOutput.match(regex)

    assert(match?.length)

    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['pack', 'read', match[1], tempDir])
      .env(env)
      .join()
    assert.equal(status.code, 0)
    assert.match(
      output,
      /Successfully wrote \d+ bytes to .*\/baf[a-z0-9]+\.car\s*/
    )
  })

  it('can pack clear', async () => {
    const clear = await hashStreamCmd.args(['pack', 'clear']).env(env).join()
    assert.match(clear.output, /\n*Cleared all files in directory:\s*\/[\S]+\n/)
  })
})
