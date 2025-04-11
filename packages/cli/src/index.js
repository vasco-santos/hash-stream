import path from 'path'
import fs from 'fs'
import all from 'it-all'

import { CarIndexer } from '@ipld/car'
import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'

import { getClient } from './lib.js'
import {
  getFileStream,
  resolveStoreBackend,
  fanOutAsyncIterator,
} from './utils.js'

/**
 * @param {string} packCid
 * @param {string} filePath
 * @param {string} [containingCid]
 * @param {{
 *   _: string[],
 *   'index-writer': 'single-level' | 'multiple-level' | 'all',
 *   'store-backend'?: 'fs' | 's3'
 * }} [opts]
 */
export const indexAdd = async (
  packCid,
  filePath,
  containingCid,
  opts = { 'index-writer': 'multiple-level', 'store-backend': undefined, _: [] }
) => {
  const indexWriterImplementationName = validateIndexWriter(
    opts['index-writer']
  )
  const storeBackend = resolveStoreBackend(opts['store-backend'])
  const client = await getClient({
    indexWriterImplementationName,
    storeBackend,
  })
  if (
    !client.index.writers.length ||
    !client.index.reader ||
    !client.index.store
  ) {
    console.error('Error: Index is not available.')
    process.exit(1)
  }

  /** @type {import('multiformats').MultihashDigest} */
  let packMultihash
  try {
    packMultihash = CID.parse(packCid).multihash
  } catch (err) {
    console.error('Error parsing pack CID:', err)
    process.exit(1)
  }

  const fileStream = await getFileStream(filePath)
  const blobIndexIterable = await CarIndexer.fromIterable(fileStream)
  // Wrap blob index iterable to log indexed blobs
  const wrappedBlobIndexIterable = {
    [Symbol.asyncIterator]: async function* () {
      for await (const blobIndex of blobIndexIterable) {
        console.info(
          `Indexed Blob: 
    ${blobIndex.cid.toString()}
    base58btc(${base58btc.encode(blobIndex.cid.multihash.bytes)})
    location: ${base58btc.encode(packMultihash.bytes)}
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

  console.info(
    `\nIndexing writer implementation: ${indexWriterImplementationName}
    Store backend: ${storeBackend}
    Indexing blobs...`
  )

  // Multiplex streams to each index writer
  const streams = fanOutAsyncIterator(
    wrappedBlobIndexIterable,
    client.index.writers.length
  )
  for (let i = 0; i < client.index.writers.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    await client.index.writers[i].addBlobs(streams[i], {
      containingMultihash: containingCidLink?.multihash,
    })
  }

  // await client.index.writers[0].addBlobs(wrappedBlobIndexIterable, {
  //   containingMultihash: containingCidLink?.multihash,
  // })
}

/**
 * @param {string} targetCid
 * @param {string} [containingCid]
 * @param {{
 *   _: string[],
 *   'store-backend'?: 'fs' | 's3'
 * }} [opts]
 */
export const indexFindRecords = async (
  targetCid,
  containingCid,
  opts = { 'store-backend': undefined, _: [] }
) => {
  const storeBackend = resolveStoreBackend(opts['store-backend'])
  const client = await getClient({
    indexWriterImplementationName: 'none',
    storeBackend,
  })

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

  console.info(
    `\nStore backend: ${storeBackend}
    Finding target...
    ${targetCid}
    base58btc(${base58btc.encode(targetMultihash.bytes)})`
  )

  try {
    const records = await all(
      client.index.reader.findRecords(targetMultihash, {
        containingMultihash: containingCidLink?.multihash,
      })
    )
    if (!records.length) {
      console.info(`\nIndex Records:
    Not found.`)
      return
    }
    console.info(`\nIndex Records:`)
    logRecords(records)
  } catch (err) {
    console.log('Error finding target:', err)
  }
}

/**
 * @param {{
 *   _: string[],
 *   'store-backend'?: 'fs' | 's3'
 * }} [opts]
 */
export const indexClear = async (
  opts = { 'store-backend': undefined, _: [] }
) => {
  const storeBackend = resolveStoreBackend(opts['store-backend'])
  if (storeBackend === 's3') {
    console.error(`Error clearing ${storeBackend}: Not supported`)
    process.exit(1)
  }

  const client = await getClient({
    indexWriterImplementationName: 'none',
    storeBackend,
  })

  // @ts-expect-error not existing in s3 store
  const directoryPath = client.index.store.directory
  if (!directoryPath) {
    console.error('Error: Directory path is not available.')
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
const VALID_INDEX_WRITERS = ['single-level', 'multiple-level', 'all']

/**
 * Validates the given index writer implementation.
 *
 * @param {string} [strategy]
 * @returns {'single-level' | 'multiple-level' | 'all'}
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
      `${indent}multihash: base58btc(${base58btc.encode(
        record.multihash.bytes || new Uint8Array()
      )})
${indent}location: base58btc(${base58btc.encode(
        record.location.bytes || new Uint8Array()
      )})
${indent}type: ${TypeStr[record.type]}, offset: ${
        record.offset || 'N/A'
      }, length: ${record.length || 'N/A'}\n`
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
