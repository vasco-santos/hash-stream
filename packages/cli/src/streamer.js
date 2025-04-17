import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'
import { equals } from 'uint8arrays/equals'
import { streamer } from '@hash-stream/utils/trustless-ipfs-gateway'

import { getClient } from './lib.js'
import { resolveStoreBackend } from './utils.js'

const dagPbCode = 0x70

/**
 * @param {string} targetCid
 * @param {string} filePath
 * @param {string} [containingCid]
 * @param {{
 *   _: string[],
 *   'index-writer': 'single-level' | 'multiple-level',
 *   format: 'car' | 'raw',
 *   'store-backend'?: 'fs' | 's3'
 * }} [opts]
 */
export const streamerDump = async (
  targetCid,
  filePath,
  containingCid,
  opts = {
    'index-writer': 'multiple-level',
    format: 'car',
    'store-backend': undefined,
    _: [],
  }
) => {
  const storeBackend = resolveStoreBackend(opts['store-backend'])
  const indexWriterImplementationName = validateIndexWriter(
    opts['index-writer']
  )

  validateFormat(opts.format)

  let targetMultihash
  try {
    targetMultihash = CID.parse(targetCid).multihash
    console.log(`Target CID: MH(${targetCid})`)
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
    console.log(`Containing CID: MH(${containingCid})`)
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
  const client = await getClient({
    indexWriterImplementationName,
    storeBackend,
  })
  if (!client.streamer) {
    console.error('Error: Streamer not available.')
    process.exit(1)
  }

  // Create a CAR from the blobs
  let roots = []
  if (!containingMultihash) {
    roots.push(CID.createV1(dagPbCode, targetMultihash))
  }

  // Get the verifiable blobs from the blob async iterable
  const verifiableBlobsAsyncIterable = client.streamer.stream(targetMultihash, {
    containingMultihash,
  })

  if (opts.format === 'car') {
    // transform it into a CAR ReadableStream
    const readableStream = await streamer.asCarReadableStream(
      targetMultihash,
      verifiableBlobsAsyncIterable,
      {
        roots,
        targetMultihashCodec:
          containingMultihash &&
          !equals(containingMultihash.bytes, targetMultihash.bytes)
            ? RawCode
            : dagPbCode,
      }
    )

    if (!readableStream) {
      await fs.promises.rm(resolvedPath, { force: true })
      console.info(`\nNo entries for ${targetCid} were found`)
      return
    }
    // Write the CAR to a file
    // @ts-expect-error web stream and node stream types are not compatible
    Readable.fromWeb(readableStream).pipe(fs.createWriteStream(resolvedPath))

    console.info(
      `\nSuccessfully wrote ${targetCid} bytes as CAR to ${resolvedPath}`
    )
  } else {
    // transform it into a RAW Uint8Array
    const rawUint8Array = await streamer.asRawUint8Array(
      targetMultihash,
      verifiableBlobsAsyncIterable
    )

    if (!rawUint8Array) {
      await fs.promises.rm(resolvedPath, { force: true })
      console.info(`\nNo entries for ${targetCid} were found`)
      return
    }
    // Write the RAW to a file
    await fs.promises.writeFile(resolvedPath, rawUint8Array)

    console.info(
      `\nSuccessfully wrote ${targetCid} bytes as RAW to ${resolvedPath}`
    )
  }
}

/**
 * @param {string} type
 */
function validateFormat(type) {
  if (type !== 'car' && type !== 'raw') {
    console.error(
      `Error: Invalid type "${type}". Only "car" and "raw" are supported.`
    )
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
