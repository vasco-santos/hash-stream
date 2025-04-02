import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

import { CarWriter } from '@ipld/car/writer'
import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { base58btc } from 'multiformats/bases/base58'

import { getClient } from './lib.js'

/**
 * @param {string} targetCid
 * @param {string} filePath
 * @param {string} [containingCid]
 * @param {{
 *   _: string[],
 * 'index-writer': 'single-level' | 'multiple-level',
 *   format: 'car',
 * }} [opts]
 */
export const streamerDump = async (
  targetCid,
  filePath,
  containingCid,
  opts = { 'index-writer': 'multiple-level', format: 'car', _: [] }
) => {
  const indexWriterImplementationName = validateIndexWriter(
    opts['index-writer']
  )

  validateFormat(opts.format)

  let targetMultihash
  try {
    targetMultihash = CID.parse(targetCid).multihash
    console.log(
      `Target CID:
      ${targetCid}
      base58btc(${base58btc.encode(targetMultihash.bytes)})`
    )
  } catch (err) {
    console.error('Error parsing target CID:', err)
    process.exit(1)
  }

  let containingMultihash
  if (containingCid) {
    try {
      containingMultihash = CID.parse(containingCid).multihash
    } catch (err) {
      console.error('Error parsing containing CID:', err)
      process.exit(1)
    }
    console.log(
      `Containing CID:
      ${containingCid}
      base58btc(${base58btc.encode(containingMultihash.bytes)})`
    )
  }

  let resolvedPath
  if (filePath) {
    resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath)
  } else {
    // Default to current working directory
    resolvedPath = process.cwd()
  }

  // get client
  const client = await getClient({ indexWriterImplementationName })
  if (!client.streamer) {
    console.error('Error: Streamer not available.')
    process.exit(1)
  }

  // Create a CAR from the blobs
  const { writer: carWriter, out } = await CarWriter.create([])
  Readable.from(out).pipe(fs.createWriteStream(resolvedPath))

  let hasEntries = false
  for await (const { multihash, bytes } of client.streamer.stream(
    targetMultihash,
    { containingMultihash }
  )) {
    hasEntries = true
    const cid = CID.createV1(RawCode, multihash)
    carWriter.put({ cid, bytes })
  }
  await carWriter.close()

  if (!hasEntries) {
    await fs.promises.rm(resolvedPath, { force: true })
    console.info(`\nNo entries for ${targetCid} were found`)
    return
  }

  console.info(`\nSuccessfully wrote ${targetCid} bytes to ${resolvedPath}`)
}

/**
 * @param {string} type
 */
function validateFormat(type) {
  if (type !== 'car') {
    console.error(`Error: Invalid type "${type}". Only "car" is supported.`)
    process.exit(1)
  }
}

// Allowed strategies
const VALID_INDEX_WRITERS = ['single-level', 'multiple-level']

/**
 * Validates the given index writer implementation.
 *
 * @param {string} [strategy]
 * @returns {'single-level' | 'multiple-level'}
 */
function validateIndexWriter(strategy) {
  if (!strategy) {
    return 'multiple-level'
  }

  if (!VALID_INDEX_WRITERS.includes(strategy)) {
    console.error(
      `Error: Invalid strategy "${strategy}". Use "single-level" or "multiple-level".`
    )
    process.exit(1)
  }

  // @ts-ignore
  return strategy
}
