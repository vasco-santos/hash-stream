import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { base58btc } from 'multiformats/bases/base58'

import { getClient } from './lib.js'
import { getFileStream, resolveStoreBackend } from './utils.js'

// 128MiB that is 134217728 bytes
export const MAX_PACK_SIZE = 133_169_152

export const DAGPB_CODE = 0x70

/**
 * @param {string} filePath
 * @param {{
 *   _: string[],
 *   'index-writer': 'single-level' | 'multiple-level' | 'all' | 'none',
 *   format: 'car',
 *   'pack-size': number,
 *   'store-backend'?: 'fs' | 's3'
 * }} [opts]
 */
export const packWrite = async (
  filePath,
  opts = {
    'index-writer': 'multiple-level',
    format: 'car',
    'pack-size': MAX_PACK_SIZE,
    'store-backend': undefined,
    _: [],
  }
) => {
  const storeBackend = resolveStoreBackend(opts['store-backend'])
  const indexWriterImplementationName = validateIndexWriter(
    opts['index-writer']
  )

  validateFormat(opts.format)

  const client = await getClient({
    indexWriterImplementationName,
    storeBackend,
  })
  const fileStream = await getFileStream(filePath)
  /** @type {Map<string, import('multiformats').MultihashDigest[]>} */
  const packBlobsMap = new Map()

  console.info(
    `\nPacking file: ${filePath}
    Pack Max Size: ${opts['pack-size']} bytes
    Index Writer: ${indexWriterImplementationName}
    Store backend: ${storeBackend}`
  )
  const { containingMultihash, packsMultihashes } =
    await client.pack.writer.write(
      {
        // @ts-expect-error 'ReadableStream<any>' is not assignable to type 'ReadableStream<Uint8Array<ArrayBufferLike>>'
        stream: () => Readable.toWeb(fileStream),
      },
      {
        type: 'car',
        shardSize: opts['pack-size'],
        /**
         * @type {import('@hash-stream/pack/types').PackWriterWriteOptions['onPackWrite']}
         */
        onPackWrite: (packMultihash, blobMultihashes) => {
          const encodedPackMultihash = base58btc.encode(packMultihash.bytes)
          packBlobsMap.set(encodedPackMultihash, blobMultihashes)
        },
      }
    )

  const containingCid = CID.create(1, DAGPB_CODE, containingMultihash)
  console.info(
    `\nContaining CID:
    ${containingCid}
    base58btc(${base58btc.encode(containingMultihash.bytes)})`
  )

  console.info(`\nPacks:`)
  const indent = '    '
  for (const packMultihash of packsMultihashes) {
    const packCid = CID.create(1, RawCode, packMultihash)
    const encodedPackMultihash = base58btc.encode(packMultihash.bytes)
    console.info(
      `${indent}${packCid}
    base58btc(${encodedPackMultihash})`
    )
    console.info(`${indent}${indent}Blobs:`)
    const blobs = packBlobsMap.get(encodedPackMultihash)
    if (!blobs) {
      console.error(`No blobs found for pack ${encodedPackMultihash}`)
      continue
    }
    for (const blob of blobs) {
      const blobCid = CID.create(1, RawCode, blob)
      console.info(
        `${indent}${indent}${indent}${blobCid}
            base58btc(${base58btc.encode(blob.bytes)})\n`
      )
    }
    console.info('\n')
  }
}

/**
 * @param {string} targetCid
 * @param {string} [filePath]
 * @param {{
 *   _: string[],
 *   format: 'car',
 *   'store-backend'?: 'fs' | 's3'
 * }} [opts]
 */
export const packExtract = async (
  targetCid,
  filePath,
  opts = { format: 'car', 'store-backend': undefined, _: [] }
) => {
  validateFormat(opts.format)
  const storeBackend = resolveStoreBackend(opts['store-backend'])

  let targetMultihash
  try {
    targetMultihash = CID.parse(targetCid).multihash
  } catch (err) {
    console.error('Error parsing target CID:', err)
    process.exit(1)
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

  const client = await getClient({
    indexWriterImplementationName: 'none',
    storeBackend,
  })

  // Currenty only car is supported
  const entries = []
  for await (const entry of client.pack.reader.stream(targetMultihash)) {
    entries.push(entry)
  }

  if (entries.length !== 1) {
    console.error(
      `Error: Expected 1 entry in the store, but got ${entries.length}. Please check the provided multihash.`
    )
    process.exit(1)
  }

  const entry = entries[0]
  await fs.promises.writeFile(resolvedPath, entry.bytes, 'binary')
  console.info(
    `\nSuccessfully wrote ${entry.bytes.byteLength} bytes to ${resolvedPath}`
  )
}

/**
 * @param {{
 *   _: string[],
 *   'store-backend'?: 'fs' | 's3'
 * }} [opts]
 */
export const packClear = async (
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
const VALID_INDEX_WRITERS = ['single-level', 'multiple-level', 'all', 'none']

/**
 * Validates the given index strategy.
 *
 * @param {string} [strategy]
 * @returns {'single-level' | 'multiple-level' | 'all' | 'none'}
 */
function validateIndexWriter(strategy) {
  if (!strategy) {
    return 'multiple-level'
  }

  if (!VALID_INDEX_WRITERS.includes(strategy)) {
    console.error(
      `Error: Invalid strategy "${strategy}". Use "single-level" or "multiple-level" or "none".`
    )
    process.exit(1)
  }

  // @ts-ignore
  return strategy
}

/**
 * @param {string} format
 */
function validateFormat(format) {
  if (format !== 'car') {
    console.error(`Error: Invalid format "${format}". Only "car" is supported.`)
    process.exit(1)
  }
}

export const CarCode = 0x0202
