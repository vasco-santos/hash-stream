import assert from 'assert'

import { normalizeCid } from '../../src/trustless-ipfs-gateway/cid.js'

import { randomCID } from '../helpers/random.js'

describe(`trustless ipfs gateway cid utils`, () => {
  it('normalizes a CID string to a CID', async () => {
    const cid = await randomCID()
    const normalizedCid = await normalizeCid(cid.toString())
    assert(cid.equals(normalizedCid))
  })
  it('fails to normalized a CID string that represents an invalid cid', async () => {
    const cidString = 'invalid-cid-string'
    await assert.rejects(() => normalizeCid(cidString))
  })
})
