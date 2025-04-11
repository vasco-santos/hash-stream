// @ts-expect-error no types
import { Multibases } from 'ipfs-core-utils/multibases'
import { bases } from 'multiformats/basics'
import { CID } from 'multiformats/cid'

/**
 * Parse CID and return normalized b32 v1.
 *
 * @param {string} cidString - The cidString to normalize.
 * @returns {Promise<CID>} - The normalized CID.
 */
export async function normalizeCid(cidString) {
  const baseDecoder = await getMultibaseDecoder(cidString)
  const c = CID.parse(cidString, baseDecoder)
  return c.toV1()
}

/**
 * Get multibase to decode CID
 *
 * @param {string} cidString - The cidString to decode.
 */
async function getMultibaseDecoder(cidString) {
  const multibaseCodecs = Object.values(bases)
  const basicBases = new Multibases({
    bases: multibaseCodecs,
  })

  const multibasePrefix = cidString[0]
  const base = await basicBases.getBase(multibasePrefix)

  return base.decoder
}

export const identityCid = CID.parse(`bafkqaaa`)
