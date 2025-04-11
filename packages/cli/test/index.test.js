import assert from 'assert'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { createEnv } from './helpers/env.js'
import * as Command from './helpers/process.js'
import { createS3Like, createBucket } from './helpers/resources.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const binPath = join(__dirname, '../src/bin.js')
const hashStreamCmd = Command.create(binPath)
const env = createEnv()

describe('CLI index', () => {
  /** @type {Record<string, string>} */
  let awsEnv

  before(async () => {
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
      /\n*Pack CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+\s*Indexing writer implementation: single-level\n\s+Store backend: fs\n\s+Indexing blobs\.\.\.\n+(?:Indexed Blob:\s*\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+location: zQm[a-zA-Z0-9]+\n\s+offset: \d+ length: \d+\n*)+/
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
    // Match Pack CID
    assert.match(
      add.output,
      /Pack CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)/
    )

    // Match Containing CID
    assert.match(
      add.output,
      /Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)/
    )

    // Match Indexing writer implementation
    assert.match(add.output, /Indexing writer implementation: multiple-level/)

    // Match "Store backend: fs" part (optional)
    assert.match(add.output, /\s+Store backend: fs/)

    // Match "Indexing blobs..." part (optional)
    assert.match(add.output, /\s+Indexing blobs\.\.\./)

    // Match Indexed Blob with extra indentation
    assert.match(
      add.output,
      /Indexed Blob:\s*\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+location: zQm[a-zA-Z0-9]+\n\s+offset: \d+ length: \d+/
    )

    // Match additional Indexed Blob(s) with correct indentation
    assert.match(
      add.output,
      /(?:\s*Indexed Blob:\s*\n\s+[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+location: zQm[a-zA-Z0-9]+\n\s+offset: \d+ length: \d+\n*)+/
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

    // Match Pack CID
    assert.match(
      add.output,
      /Pack CID:\n\s+bag[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)/
    )

    // Match optional Containing CID (it may or may not be present)
    assert.match(
      add.output,
      /(?:Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+)?/
    )

    // Match Indexing writer implementation
    assert.match(add.output, /Indexing writer implementation: multiple-level/)

    // Match "Store backend: fs" part (optional)
    assert.match(add.output, /\s+Store backend: fs/)

    // Match "Indexing blobs..." part (optional)
    assert.match(add.output, /\s+Indexing blobs\.\.\./)

    // Match Indexed Blob with extra indentation
    assert.match(
      add.output,
      /Indexed Blob:\s*\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+location: zQm[a-zA-Z0-9]+\n\s+offset: \d+ length: \d+/
    )

    // Match additional Indexed Blob(s) with correct indentation
    assert.match(
      add.output,
      /(?:\s*Indexed Blob:\s*\n\s+[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s+location: zQm[a-zA-Z0-9]+\n\s+offset: \d+ length: \d+\n*)+/
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

  it('can index find records written with single index writer implementation', async () => {
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

    // Match Target CID
    assert.match(
      find.output,
      /Target CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)/
    )

    // Match Indexing store implementation (includes optional Store backend)
    assert.match(find.output, /\s+Store backend: fs/)

    // Match Index Records section
    assert.match(
      find.output,
      /Index Records:\n\s*multihash:\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s*location:\s+base58btc\(zQm[a-zA-Z0-9]+\)\n\s*type:\s+BLOB,\s+offset:\s*\d+,\s+length:\s*\d+/
    )
  })

  it('can not find records for unknown target', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ncm',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)

    // Match Target CID
    assert.match(
      find.output,
      /Target CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)/
    )

    // Match Finding target written using (single-level)
    assert.match(find.output, /Finding target\s*\.\.\.\n/)

    // Match Index Records: Not found
    assert.match(find.output, /Index Records:\n\s+Not found\./)
  })

  it('can index find records for a blob written with multiple index writer implementation', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
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

    // Match Finding target written using (multiple-level) - Adjusted
    assert.match(
      find.output,
      /Finding target\s*\.\.\.\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Index Records section
    assert.match(find.output, /Index Records:/)

    // Match type: BLOB, offset, length
    assert.match(find.output, /type: BLOB,.*offset: \d+,.*length: \d+/)
  })

  it('can index find records for a pack written with multiple index writer implementation', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
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
      /Finding target\s*\.\.\.\n\s+(bag|baf)[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
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

  it('can index find records for a containing written with multiple index writer implementation', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)

    // Match Target CID
    assert.match(
      find.output,
      /Target CID:\n\s+(bag|baf)[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Finding target
    assert.match(
      find.output,
      /Finding target\.\.\.\n\s+(bag|baf)[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
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

  it('can not find records for unknown target', async () => {
    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua2yprewa',
        'bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm',
      ])
      .env(env)
      .join()

    assert.equal(find.status.code, 0)

    // Match Target CID
    assert.match(
      find.output,
      /\s*Target CID:\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Containing CID
    assert.match(
      find.output,
      /\s*Containing CID:\n\s+baf[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Finding target
    assert.match(
      find.output,
      /\s*Finding target\.\.\.\n\s+bafy[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Index Records: Not found
    assert.match(find.output, /Index Records:\n\s+Not found\.\n/)
  })

  it('can index clear', async () => {
    const clear = await hashStreamCmd.args(['index', 'clear']).env(env).join()
    assert.match(clear.output, /\n*Cleared all files in directory:\s*\/[\S]+\n/)
  })

  it('can index add and find records with s3 like bucket', async () => {
    const add = await hashStreamCmd
      .args([
        'index',
        'add',
        'bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra',
        'test/fixture.car',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        '--index-writer',
        'multiple-level',
        '--store-backend',
        's3',
      ])
      .env({
        ...env,
        ...awsEnv,
      })
      .join()

    assert.equal(add.status.code, 0)

    // Match "Store backend: s3" part
    assert.match(add.output, /\s+Store backend: s3/)

    const find = await hashStreamCmd
      .args([
        'index',
        'find',
        'records',
        'bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa',
        '--store-backend',
        's3',
      ])
      .env({
        ...env,
        ...awsEnv,
      })
      .join()

    assert.equal(find.status.code, 0)

    // Match "Store backend: s3" part
    assert.match(find.output, /\s+Store backend: s3/)

    // Match Target CID
    assert.match(
      find.output,
      /Target CID:\n\s+(bag|baf)[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Finding target
    assert.match(
      find.output,
      /Finding target\.\.\.\n\s+(bag|baf)[a-z0-9]+\n\s+base58btc\(zQm[a-zA-Z0-9]+\)\n+/
    )

    // Match Index Records section
    assert.match(find.output, /Index Records:/)

    // Match type: CONTAINING, offset, length
    assert.match(find.output, /type: CONTAINING, offset: N\/A, length: N\/A/)
  })
})
