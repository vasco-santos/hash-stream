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

describe('CLI index', () => {
  it('fails index add if invalid pack CID provided', async () => {
    const fail = await hashStreamCmd
      .args(['index', 'add', 'bagbaieraquzn', 'test/fixture.car'])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing pack CID/)
  })

  it('fails index add if invalid containing CID provided', async () => {
    const fail = await hashStreamCmd
      .args([
        'index',
        'add',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        'bafynononon',
      ])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing containing CID/)
  })

  it('fails index add if it does not find the CAR file', async () => {
    const fail = await hashStreamCmd
      .args([
        'index',
        'add',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/no.car',
      ])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /File does not exist at path/)
  })

  it('can index add with single index writer implementation', async () => {
    const add = await hashStreamCmd
      .args([
        'index',
        'add',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        '--index-writer',
        'single-level',
      ])
      .env(env)
      .join()

    assert.equal(add.status.code, 0)
    assert.match(
      add.output,
      /\n*Pack CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Indexing with implementation \(single-level\)\.\.\.\n+(?:Indexed Blob:\s*\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+location: zQm[a-zA-Z0-9]+\n\s+offset: \d+ length: \d+\n*)+/
    )
  })

  it('can index add with multiple index writer implementation', async () => {
    const add = await hashStreamCmd
      .args([
        'index',
        'add',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        '--index-writer',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(add.status.code, 0)
    assert.match(
      add.output,
      /\n*Pack CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Indexing with implementation \(multiple-level\)\.\.\.\n+(?:Indexed Blob:\s*\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+location: zQm[a-zA-Z0-9]+\n\s+offset: \d+ length: \d+\n*)+/
    )
  })

  it('can index add without containing CID for multiple index writer implementation', async () => {
    const add = await hashStreamCmd
      .args([
        'index',
        'add',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        '--index-writer',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(add.status.code, 0)
    assert.match(
      add.output,
      /\n*Pack CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*(?:Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+)?\s*Indexing with implementation \(multiple-level\)\.\.\.\n+(?:Indexed Blob:\s*\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+location: zQm[a-zA-Z0-9]+\n\s+offset: \d+ length: \d+\n*)+/
    )
  })

  it('fails index find records if invalid target CID provided', async () => {
    const fail = await hashStreamCmd
      .args(['index', 'find', 'records', 'bagbaieraquzn'])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing target CID/)
  })

  it('fails index find records if invalid containing CID provided', async () => {
    const fail = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'bafynononon',
      ])
      .env(env)
      .join()
      .catch()

    assert.match(fail.error, /Error parsing containing CID/)
  })

  it('can index find records with single index writer implementation', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
        '--index-writer',
        'single-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    assert.match(
      find.output,
      /\n*Target CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Finding target written using \(single-level\)\.\.\.\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Index Records:\n\s*multihash:\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s*location:\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s*type:\s+BLOB,\s+offset:\s*\d+,\s+length:\s*\d+\n*/
    )
  })

  it('can not find records with index find records with single index writer implementation for unknown target', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ncm',
        '--index-writer',
        'single-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    assert.match(
      find.output,
      /\n*Target CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Finding target written using \(single-level\)\.\.\.\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Index Records:\n\s+Not found\.\n*/
    )
  })

  it('can index find records with multiple index writer implementation for a blob', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        '--index-writer',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    // Match Target CID
    assert.match(
      find.output,
      /Target CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Containing CID
    assert.match(
      find.output,
      /Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Finding target written using (multiple-level)
    assert.match(
      find.output,
      /Finding target written using \(multiple-level\)\.\.\.\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Index Records section
    assert.match(find.output, /Index Records:/)

    // Match type: BLOB, offset, length
    assert.match(find.output, /type: BLOB,.*offset: \d+,.*length: \d+/)
  })

  it('can index find records with multiple index writer implementation for a pack', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        '--index-writer',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    // Match Target CID
    assert.match(
      find.output,
      /Target CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Containing CID
    assert.match(
      find.output,
      /Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Finding target written using (multiple-level)
    assert.match(
      find.output,
      /Finding target written using \(multiple-level\)\.\.\.\n\s+(bag|baf)[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Index Records section
    assert.match(find.output, /Index Records:/)

    // Match type: PACK, offset, length
    assert.match(find.output, /type: PACK, offset: N\/A, length: N\/A/)

    // Match Sub-Records section (allow multiple sub-records)
    assert.match(
      find.output,
      /Sub-Records:\n\s*(multihash:\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s*location:\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s*type:\s+BLOB,\s+offset:\s*\d+,\s+length:\s*\d+\s*)+/
    )
  })

  it('can index find records with multiple index writer implementation for a containing', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        '--index-writer',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)

    // Match Target CID
    assert.match(
      find.output,
      /Target CID:\n\s+(bag|baf)[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Finding target written using (multiple-level)
    assert.match(
      find.output,
      /Finding target written using \(multiple-level\)\.\.\.\n\s+(bag|baf)[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Index Records section
    assert.match(find.output, /Index Records:/)

    // Match type: CONTAINING, offset, length
    assert.match(find.output, /type: CONTAINING, offset: N\/A, length: N\/A/)

    // Match Sub-Records section (allow multiple sub-records, including nested)
    assert.match(
      find.output,
      /Sub-Records:\s*multihash:\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*location:\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*type:\s*PACK,\s*offset:\s*N\/A,\s*length:\s*N\/A/
    )
    assert.match(
      find.output,
      /Sub-Records:\s*multihash:\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*location:\s*base58btc\(zQm[a-zA-Z0-9]+\)\s*type:\s*BLOB,\s*offset:\s*\d+,\s*length:\s*\d+\s*/
    )
  })

  it('can not find records with multiple index writer implementation for unknown target', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua2yprewa',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
        '--index-writer',
        'multiple-level',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)
    // Adjusting the regex to be more flexible with newlines and spacing

    assert.match(
      find.output,
      /\s*Target CID:\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Finding target written using \(multiple-level\)\.\.\.\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Index Records:\n\s+Not found\.\n*/,
      'Output did not match expected pattern for unknown target'
    )
  })

  it('can index clear', async () => {
    const clear = await hashStreamCmd.args(['index', 'clear']).env(env).join()
    assert.match(clear.output, /\n*Cleared all files in directory:\s*\/[\S]+\n/)
  })

  it('can index clear for index writer implementation', async () => {
    const clear = await hashStreamCmd
      .args(['index', 'clear', '--index-writer', 'multiple-level'])
      .env(env)
      .join()
    assert.match(clear.output, /\n*Cleared all files in directory:\s*\/[\S]+\n/)
  })
})
