import assert from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { randomBytes } from './helpers/random.js'
import { createEnv } from './helpers/env.js'
import * as Command from './helpers/process.js'
import { createS3Like, createBucket } from './helpers/resources.js'

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
  /** @type {Record<string, string>} */
  let awsEnv

  before(async () => {
    // FS Prep
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-pack-test-'))
    const bytes = await randomBytes(byteLength)
    testFilePath = path.join(tempDir, 'random.txt')
    fs.writeFileSync(testFilePath, bytes)

    // S3 like prep
    const { client, clientOpts } = await createS3Like()
    const indexBucket = await createBucket(client)
    const packBucket = await createBucket(client)

    awsEnv = {
      AWS_ACCESS_KEY_ID: clientOpts.credentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: clientOpts.credentials.secretAccessKey,
      AWS_REGION: clientOpts.region,
      AWS_ENDPOINT: clientOpts.endpoint,
      HASH_STREAM_S3_INDEX_BUCKET: indexBucket,
      HASH_STREAM_S3_PACK_BUCKET: packBucket,
    }
  })

  after(() => {
    // FS Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('pack write a file', async () => {
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath])
      .join()

    assert.equal(status.code, 0)

    // Match Packing file and Max Size
    assert.match(
      output,
      /Packing file: .*\/random\.txt\s*\n\s*Pack Max Size: 133169152 bytes\s*\n\s*Index Writer: multiple-level\s*\n/
    )

    // Match Containing CID and base58btc
    assert.match(
      output,
      /Containing CID:\s*\n\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n/
    )

    // Match the "Packs" and "Blobs" structure
    assert.match(
      output,
      /Packs:\s*\n(?:\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n\s*Blobs:\s*\n(?:\s*baf[a-z0-9]+\s*\n\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*\n*)+)/
    )

    // Match Store backend
    assert.match(output, /Store backend: fs\s*\n/)
  })

  it('pack write a file with index disabled', async () => {
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--index-writer', 'none'])
      .join()

    assert.equal(status.code, 0)

    assert.match(
      output,
      /Packing file: .*\/random\.txt\s*\n\s*Pack Max Size: \d+(?: bytes)?\s*\n\s*Index Writer: none\s*\n\s*Store backend: fs\s*\n\s*Containing CID:\s*\n\s*baf[a-z0-9]+\s*\n\s*base58btc\([a-zA-Z0-9]+\)\s*\n\s*Packs:\s*\n(?:\s*baf[a-z0-9]+\s*\n\s*base58btc\([a-zA-Z0-9]+\)\s*\n\s*Blobs:\s*\n(?:\s*baf[a-z0-9]+\s*\n\s*base58btc\([a-zA-Z0-9]+\)\s*\n*)+)/
    )
  })

  it('pack write a file with custom max size', async () => {
    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--pack-size', `${byteLength / 2}`])
      .join()

    assert.equal(status.code, 0)
    assert.match(
      output,
      /\n*Packing file: .*\/random\.txt\n\s+Pack Max Size: 5000000 bytes\n+\s*Index Writer: multiple-level\n\s*(Store backend: fs\n)?\s*Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Packs:\n+(?:\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Blobs:\n(?:\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+)+)+/
    )
  })

  it('pack write fails if format is not car', async () => {
    const fail = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--format', 'zip'])
      .join()
      .catch()

    assert.match(
      fail.error,
      /Error: Invalid format "zip". Only "car" is supported.\n/
    )
  })

  it('pack extract a file after write', async () => {
    const { output: writeOutput, status: writeStatus } = await hashStreamCmd
      .env(env)
      .args(['pack', 'write', testFilePath, '--index-writer', 'none'])
      .join()

    assert.equal(writeStatus.code, 0)

    const regex = /Packs:\s*\n\s*(baf[a-z0-9]+)/
    const match = writeOutput.match(regex)

    assert(match?.length)

    const { output, status } = await hashStreamCmd
      .env(env)
      .args(['pack', 'extract', match[1], `${tempDir}/${match[1]}.car`])
      .join()
    assert.equal(status.code, 0)
    assert.match(output, /Successfully wrote \d+ bytes to .*\.car\n?/)
  })

  it('can pack clear', async () => {
    const clear = await hashStreamCmd.args(['pack', 'clear']).env(env).join()
    assert.match(clear.output, /\n*Cleared all files in directory:\s*\/[\S]+\n/)
  })

  it('pack write and export a file from a s3 like bucket', async () => {
    const { output: writeOutput, status: writeStatus } = await hashStreamCmd
      .env({
        ...env,
        ...awsEnv,
      })
      .args([
        'pack',
        'write',
        testFilePath,
        '--store-backend',
        's3',
        '--index-writer',
        'none',
      ])
      .join()

    assert.equal(writeStatus.code, 0)

    // Match Store backend
    assert.match(writeOutput, /Store backend: s3\s*\n/)

    // Match pack CID
    const regex = /Packs:\s*\n\s*(baf[a-z0-9]+)/
    const match = writeOutput.match(regex)
    assert(match?.length)

    const { output, status } = await hashStreamCmd
      .env({
        ...env,
        ...awsEnv,
      })
      .args([
        'pack',
        'extract',
        match[1],
        `${tempDir}/${match[1]}.car`,
        '--store-backend',
        's3',
      ])
      .join()
    assert.equal(status.code, 0)
    assert.match(output, /Successfully wrote \d+ bytes to .*\.car\n?/)
  })
})
