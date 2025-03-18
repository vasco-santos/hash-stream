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

describe('CLI', () => {
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

  it('fails index create if invalid container CID provided', async () => {
    const fail = await hashStreamCmd
      .args(['index', 'create', 'bagbaieraquzn', 'test/fixture.car'])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing container CID/)
  })

  it('fails index create if invalid context CID provided', async () => {
    const fail = await hashStreamCmd
      .args([
        'index',
        'create',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        'bafynononon',
      ])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing context CID/)
  })

  it('fails index create if it does not find the CAR file', async () => {
    const fail = await hashStreamCmd
      .args([
        'index',
        'create',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/no.car',
      ])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /File does not exist at path/)
  })

  it('can index create with block strategy', async () => {
    const create = await hashStreamCmd
      .args([
        'index',
        'create',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        '--strategy',
        'block-level',
      ])
      .env(env)
      .join()

    assert.equal(create.status.code, 0)
    assert.match(
      create.output,
      /\n*Container CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Indexing \(block-level\)\.\.\.\n+(?:Indexed block:\s*\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+offset: \d+ length: \d+\n*)+/
    )
  })

  it('can index create with multiple strategy', async () => {
    const create = await hashStreamCmd
      .args([
        'index',
        'create',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        '--strategy',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(create.status.code, 0)
    assert.match(
      create.output,
      /\n*Container CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+Context CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Indexing \(multiple-level\)\.\.\.\n+(?:Indexed block:\s*\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+offset: \d+ length: \d+\n*)+/
    )
  })

  it('fails index create if it does not have context CID for multiple strategy', async () => {
    const fail = await hashStreamCmd
      .args([
        'index',
        'create',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        '--strategy',
        'multiple-level',
      ])
      .env(env)
      .join()
      .catch()

    assert.match(
      fail.error,
      /Error: Context CID is required for multiple-level indexing/
    )
  })

  it('fails index find block if invalid block CID provided', async () => {
    const fail = await hashStreamCmd
      .args(['index', 'find', 'block', 'bagbaieraquzn'])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing block CID/)
  })

  it('fails index find block if invalid context CID provided', async () => {
    const fail = await hashStreamCmd
      .args([
        'index',
        'find',
        'block',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'bafynononon',
      ])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing context CID/)
  })

  it('can index find block with block strategy', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'block',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
        '--strategy',
        'block-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    assert.match(
      find.output,
      /\n*Block CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Finding block \(block-level\)\.\.\.\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Location:\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+offset: \d+ length: \d+\n*/
    )
  })

  it('can not find block with index find block with block strategy for unknown block', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'block',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ncm',
        '--strategy',
        'block-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    assert.match(
      find.output,
      /\n*Block CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Finding block \(block-level\)\.\.\.\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Location:\n\s+Block not found\.\n*/
    )
  })

  it('can index find block with multiple strategy', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'block',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        '--strategy',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    assert.match(
      find.output,
      /\n*Block CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+(\s*Context CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+)?\s*Finding block \((?:block|multiple)-level\)\.\.\.\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Location:\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+offset: \d+ length: \d+\n*/
    )
  })

  it('can not find block with index find block with multiple strategy for unknown block', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'block',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
        '--strategy',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    assert.match(
      find.output,
      /\n*Block CID:\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+Context CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Finding block \(multiple-level\)\.\.\.\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Location:\n\s+Block not found\.\n*/
    )
  })

  it('can index find containers', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'containers',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
      ])
      .env(env)
      .join()
    assert.equal(find.status.code, 0)
    assert.match(
      find.output,
      /\n*Location:\n\s*content CID:\s+bafy[a-z0-9]+\n\s+base58btc\(z[a-zA-Z0-9]+\)\n\s*shards:\s*\n\s*(?:base58btc\(zQm[a-zA-Z0-9]+\),?\n\s*)+/
    )
  })

  it('fails index find containers if invalid content CID provided', async () => {
    const fail = await hashStreamCmd
      .args(['index', 'find', 'containers', 'bagbaieraquzn'])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing content CID/)
  })

  it('can not find index find containers for unknown content', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'containers',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    assert.match(find.output, /\n*Location:\n\s*Content not found\.\n/)
  })

  it('can index clear', async () => {
    const clear = await hashStreamCmd.args(['index', 'clear']).env(env).join()
    assert.match(clear.output, /\n*Cleared all files in directory:\s*\/[\S]+\n/)
  })
})
