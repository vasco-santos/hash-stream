import path from 'path'
import fs from 'fs'

import { CarIndexer } from '@ipld/car'
import { CID } from 'multiformats/cid'

import { getClient } from './lib.js'
import { base58btc } from 'multiformats/bases/base58'

/**
 * @param {string} containerCid
 * @param {string} filePath
 * @param {string} [contextCid]
 * @param {{
 *   _: string[],
 *   strategy: 'block-level' | 'multiple-level'
 * }} [opts]
 */
export const indexCreate = async (
  containerCid,
  filePath,
  contextCid,
  opts = { strategy: 'multiple-level', _: [] }
) => {
  const strategy = validateStrategy(opts.strategy)
  const client = await getClient()

  let containerMultihash
  try {
    containerMultihash = CID.parse(containerCid).multihash
  } catch (err) {
    console.error('Error parsing container CID:', err)
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

  const blockIndexIterable = await CarIndexer.fromIterable(fileStream)
  // Wrap block index iterable to log indexed blocks
  const wrappedBlockIndexIterable = {
    [Symbol.asyncIterator]: async function* () {
      for await (const blockIndex of blockIndexIterable) {
        console.info(
          `Indexed block: 
    ${blockIndex.cid.toString()}
    base58btc(${base58btc.encode(blockIndex.cid.multihash.bytes)})
    offset: ${blockIndex.blockOffset} length: ${blockIndex.blockLength}`
        )
        yield blockIndex
      }
    },
  }

  console.info(
    `\n\nContainer CID:
    ${containerCid}
    base58btc(${base58btc.encode(containerMultihash.bytes)})`
  )

  let contextCidLink
  if (contextCid) {
    try {
      contextCidLink = CID.parse(contextCid).link()
    } catch (err) {
      console.error('Error parsing context CID:', err)
      process.exit(1)
    }
    console.log(
      `Context CID:
    ${contextCidLink.toString()}
    base58btc(${base58btc.encode(contextCidLink.multihash.bytes)})`
    )
  }

  console.log(`\nIndexing (${strategy})...`)
  if (strategy === 'block-level') {
    await client.index.blockLevelIndex.indexContainer(
      wrappedBlockIndexIterable,
      containerMultihash
    )
  } else if (strategy === 'multiple-level') {
    if (!contextCidLink) {
      console.error(
        'Error: Context CID is required for multiple-level indexing.'
      )
      process.exit(1)
    }
    await client.index.multipleLevelIndex.indexContainer(
      wrappedBlockIndexIterable,
      containerMultihash,
      { contextCid: contextCidLink }
    )
  }
}

/**
 * @param {string} blockCid
 * @param {string} [contextCid]
 * @param {{
 *   _: string[],
 *   strategy?: 'block-level' | 'multiple-level'
 * }} [opts]
 */
export const indexFindBlock = async (
  blockCid,
  contextCid,
  opts = { strategy: 'multiple-level', _: [] }
) => {
  const strategy = validateStrategy(opts.strategy)
  const client = await getClient()

  let blockMultihash
  try {
    blockMultihash = CID.parse(blockCid).multihash
  } catch (err) {
    console.error('Error parsing block CID:', err)
    process.exit(1)
  }

  console.info(
    `\n\nBlock CID:
    ${blockCid}
    base58btc(${base58btc.encode(blockMultihash.bytes)})`
  )

  let contextCidLink
  if (contextCid) {
    try {
      contextCidLink = CID.parse(contextCid).link()
    } catch (err) {
      console.error('Error parsing context CID:', err)
      process.exit(1)
    }
    console.info(
      `Context CID:
    ${contextCidLink.toString()}
    base58btc(${base58btc.encode(contextCidLink.multihash.bytes)})`
    )
  }

  console.log(`\nFinding block (${strategy})...
    ${blockCid}
    base58btc(${base58btc.encode(blockMultihash.bytes)})`)

  if (strategy === 'block-level') {
    const location = await client.index.blockLevelIndex.findBlockLocation(
      blockMultihash
    )
    if (!location) {
      console.info(`\nLocation:
    Block not found.`)
      return
    }
    console.info(`\nLocation:
    base58btc(${base58btc.encode(location.container.bytes || new Uint8Array())})
    offset: ${location.offset} length: ${location.length}`)
  } else if (strategy === 'multiple-level') {
    const location = await client.index.multipleLevelIndex.findBlockLocation(
      blockMultihash,
      {
        contextCid: contextCidLink,
      }
    )
    if (!location) {
      console.info(`\nLocation:
    Block not found.`)
      return
    }
    console.log(`\nLocation:
    base58btc(${base58btc.encode(location.container.bytes || new Uint8Array())})
    offset: ${location.offset} length: ${location.length}`)
  }
}

/**
 * @param {string} contentCid
 */
export const indexFindContainers = async (contentCid) => {
  const client = await getClient()

  let contentMultihash
  try {
    contentMultihash = CID.parse(contentCid).multihash
  } catch (err) {
    console.error('Error parsing content CID:', err)
    process.exit(1)
  }

  const location = await client.index.multipleLevelIndex.findContainers(
    contentMultihash
  )
  if (!location) {
    console.info(`\nLocation:
    Content not found.`)
    return
  }
  console.log(`\nLocation:
    content CID: ${contentCid}
    base58btc(${base58btc.encode(
      location.contentCID.bytes || new Uint8Array()
    )})
    shards: ${location?.shards
      .map((shard) => {
        return `
        base58btc(${base58btc.encode(shard.bytes)})`
      })
      .concat('\n')}`)
}

/**
 * @param {{
 *   _: string[],
 *   strategy?: 'block-level' | 'multiple-level'
 * }} [opts]
 */
export const indexClear = async (
  opts = { strategy: 'multiple-level', _: [] }
) => {
  const strategy = validateStrategy(opts.strategy)
  const client = await getClient()

  let directoryPath
  if (strategy === 'block-level') {
    directoryPath = client.index.blockIndexStore.directory
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
      await fs.promises.unlink(filePath)
    }
    console.log(`Cleared all files in directory: ${directoryPath}`)
  } catch (err) {
    console.error(`Error clearing directory: ${directoryPath}`, err)
    process.exit(1)
  }
}

// Allowed strategies
const VALID_STRATEGIES = ['block-level', 'multiple-level']

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
      `Error: Invalid strategy "${strategy}". Use "block-level" or "multiple-level".`
    )
    process.exit(1)
  }

  return strategy
}
