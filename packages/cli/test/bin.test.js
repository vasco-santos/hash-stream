import assert from 'assert'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { createEnv } from './helpers/env.js'
import * as Command from './helpers/process.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const binPath = join(__dirname, '../src/bin.js')
const hashStreamCmd = Command.create(binPath)
const env = createEnv()

describe('CLI basics', () => {
  it('can show available commands', async () => {
    const { output } = await hashStreamCmd.env(env).join()
    assert.match(output, /Available Commands/)
  })

  it('can show version', async () => {
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['--version'])
      .env(env)
      .join()

    assert.equal(status.code, 0)
    assert.match(output, /@hash-stream\/cli, \d+\.\d+\.\d+/)
  })
})
