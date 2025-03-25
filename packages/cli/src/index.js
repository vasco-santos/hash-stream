import path from 'path'
import fs from 'fs'
import all from 'it-all'

import { CarIndexer } from '@ipld/car'
import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'

import { getClient } from './lib.js'

/**
 * @param {string} packCid
 * @param {string} filePath
 * @param {string} [containingCid]
 * @param {{
 *   _: string[],
 *   strategy: 'single-level' | 'multiple-level'
 * }} [opts]
 */
export const indexAdd = async (
  packCid,
  filePath,
  containingCid,
  opts = { strategy: 'multiple-level', _: [] }
) => {
  const strategy = validateStrategy(opts.strategy)
  const client = await getClient()

  /** @type {import('multiformats').MultihashDigest} */
  let packMultihash
  try {
    packMultihash = CID.parse(packCid).multihash
  } catch (err) {
    console.error('Error parsing pack CID:', err)
    process.exit(1)
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath)

  try {
    await fs.promises.access(resolvedPath, fs.constants.F_OK)
  } catch (err) {
    console.error(`File does not exist at path: ${resolvedPath}`)
    process.exit(1)
  }
  const fileStream = fs.createReadStream(resolvedPath)

  fileStream.on('error', (err) => {
    console.error('Error reading file:', err)
    process.exit(1)
  })

  const blobIndexIterable = await CarIndexer.fromIterable(fileStream)
  // Wrap blob index iterable to log indexed blobs
  const wrappedBlobIndexIterable = {
    [Symbol.asyncIterator]: async function* () {
      for await (const blobIndex of blobIndexIterable) {
        console.info(
          `Indexed blob: 
    ${blobIndex.cid.toString()}
    base58btc(${base58btc.encode(blobIndex.cid.multihash.bytes)})
    offset: ${blobIndex.blockOffset} length: ${blobIndex.blockLength}`
        )
        yield {
          multihash: blobIndex.cid.multihash,
          location: packMultihash,
          offset: blobIndex.blockOffset,
          length: blobIndex.blockLength,
        }
      }
    },
  }

  console.info(
    `\n\nPack CID:
    ${packCid}
    base58btc(${base58btc.encode(packMultihash.bytes)})`
  )

  let containingCidLink
  if (containingCid) {
    try {
      containingCidLink = CID.parse(containingCid).link()
    } catch (err) {
      console.error('Error parsing containing CID:', err)
      process.exit(1)
    }
    console.log(
      `Containing CID:
    ${containingCidLink.toString()}
    base58btc(${base58btc.encode(containingCidLink.multihash.bytes)})`
    )
  }

  console.log(`\nIndexing (${strategy})...`)
  if (strategy === 'single-level') {
    await client.index.singleLevelIndex.addBlobs(wrappedBlobIndexIterable)
  } else if (strategy === 'multiple-level') {
    await client.index.multipleLevelIndex.addBlobs(wrappedBlobIndexIterable, {
      containingMultihash: containingCidLink?.multihash,
    })
  }
}

/**
 * @param {string} targetCid
 * @param {string} [containingCid]
 * @param {{
 *   _: string[],
 *   strategy?: 'single-level' | 'multiple-level'
 * }} [opts]
 */
export const indexFindRecords = async (
  targetCid,
  containingCid,
  opts = { strategy: 'multiple-level', _: [] }
) => {
  const strategy = validateStrategy(opts.strategy)
  const client = await getClient()

  let targetMultihash
  try {
    targetMultihash = CID.parse(targetCid).multihash
  } catch (err) {
    console.error('Error parsing target CID:', err)
    process.exit(1)
  }

  console.info(
    `\n\nTarget CID:
    ${targetCid}
    base58btc(${base58btc.encode(targetMultihash.bytes)})`
  )

  let containingCidLink
  if (containingCid) {
    try {
      containingCidLink = CID.parse(containingCid).link()
    } catch (err) {
      console.error('Error parsing containing CID:', err)
      process.exit(1)
    }
    console.info(
      `Containing CID:
    ${containingCidLink.toString()}
    base58btc(${base58btc.encode(containingCidLink.multihash.bytes)})`
    )
  }

  console.log(`\nFinding target (${strategy})...
    ${targetCid}
    base58btc(${base58btc.encode(targetMultihash.bytes)})`)

  if (strategy === 'single-level') {
    const recordsStream = await client.index.singleLevelIndex.findRecords(
      targetMultihash
    )
    if (!recordsStream) {
      console.info(`\nIndex Records:
    Not found.`)
      return
    }
    const records = await all(recordsStream)
    console.info(`\nIndex Records:`)
    logRecords(records)
  } else if (strategy === 'multiple-level') {
    const recordsStream = await client.index.multipleLevelIndex.findRecords(
      targetMultihash,
      {
        containingMultihash: containingCidLink?.multihash,
      }
    )
    if (!recordsStream) {
      console.info(`\nIndex Records:
    Not found.`)
      return
    }

    const records = await all(recordsStream)
    console.info(`\nIndex Records:`)
    logRecords(records)
  }
}

/**
 * @param {{
 *   _: string[],
 *   strategy?: 'single-level' | 'multiple-level'
 * }} [opts]
 */
export const indexClear = async (
  opts = { strategy: 'multiple-level', _: [] }
) => {
  const strategy = validateStrategy(opts.strategy)
  const client = await getClient()

  let directoryPath
  if (strategy === 'single-level') {
    directoryPath = client.index.singleLevelIndexStore.directory
  } else if (strategy === 'multiple-level') {
    directoryPath = client.index.multipleLevelIndexStore.directory
  } else {
    console.error(`Invalid strategy: ${strategy}`)
    process.exit(1)
  }

  try {
    const files = await fs.promises.readdir(directoryPath)
    for (const file of files) {
      const filePath = path.join(directoryPath, file)
      const stats = await fs.promises.stat(filePath)

      if (stats.isDirectory()) {
        // If it's a directory, delete it recursively
        await fs.promises.rm(filePath, { recursive: true, force: true })
      } else {
        // If it's a file, remove it normally
        await fs.promises.rm(filePath, { force: true })
      }
    }
    console.log(`Cleared all files in directory: ${directoryPath}`)
  } catch (err) {
    console.error(`Error clearing directory: ${directoryPath}`, err)
    process.exit(1)
  }
}

// Allowed strategies
const VALID_STRATEGIES = ['single-level', 'multiple-level']

/**
 * Validates the given strategy.
 *
 * @param {string} [strategy]
 */
function validateStrategy(strategy) {
  if (!strategy) {
    return 'multiple-level'
  }

  if (!VALID_STRATEGIES.includes(strategy)) {
    console.error(
      `Error: Invalid strategy "${strategy}". Use "single-level" or "multiple-level".`
    )
    process.exit(1)
  }

  return strategy
}

/**
 * @param {import('@hash-stream/index/types').IndexRecord[]} records
 * @param {number} indentLevel
 */
function logRecords(records, indentLevel = 1) {
  if (!records || records.length === 0) {
    console.info('    Not found.')
    return
  }

  const indent = '    '.repeat(indentLevel)

  for (const record of records) {
    console.info(
      `${indent}base58btc(${base58btc.encode(
        record.location.bytes || new Uint8Array()
      )})
${indent}type: ${TypeStr[record.type]}, offset: ${
        record.offset || 'N/A'
      }, length: ${record.length || 'N/A'}`
    )

    if (record.subRecords && record.subRecords.length > 0) {
      console.info(`${indent}Sub-Records:`)
      logRecords(record.subRecords, indentLevel + 1)
    }
  }
}

export const TypeStr = Object.freeze({
  0: 'BLOB',
  1: 'PACK',
  2: 'CONTAINING',
})
