import { CID } from 'multiformats/cid'
import { CarWriter } from '@ipld/car'

import * as API from './api.js'
import * as streamer from './streamer.js'
import * as cidUtils from './cid.js'

/**
 * Get trustless content behind IPFS CID depending on requested format.
 *
 * @param {Request} request - The incoming HTTP request.
 * @param {{ hashStreamer: import('@hash-stream/streamer').HashStreamer }} context - Context object providing the hash streamer.
 * @returns {Promise<Response>} HTTP Response containing the CAR stream or error.
 */
export async function httpipfsGet(request, context) {
  const format = resolveRequestedFormat(request)

  switch (format) {
    case 'car':
      return await httpCarGet(request, context)
    case 'raw':
      return await httpRawGet(request, context)
    default:
      return new Response('not acceptable format', { status: 406 })
  }
}

/**
 * Get trustless content behind IPFS CID as a CAR file.
 *
 * @param {Request} request - The incoming HTTP request.
 * @param {{ hashStreamer: import('@hash-stream/streamer').HashStreamer }} context - Context object providing the hash streamer.
 * @returns {Promise<Response>} HTTP Response containing the CAR stream or error.
 */
export async function httpCarGet(request, context) {
  let cid
  let carResponseOptions

  try {
    cid = await extractCidFromRequest(request)
  } catch (/** @type {any} */ err) {
    return new Response(err.message, { status: 400 })
  }

  try {
    carResponseOptions = getCarAcceptParams(request.headers)
  } catch (/** @type {any} */ err) {
    return new Response(err.message, { status: 400 })
  }

  // Check dedicated probe paths
  if (cid.equals(cidUtils.identityCid)) {
    const identityCar = await httpCarIdentityCidGet()
    return buildCarHTTPResponse(cid, identityCar, carResponseOptions)
  }

  const fileName = extractFileNameFromRequest(request)

  // Get CARv1 ReadableStream for response
  const verifiableBlobsAsyncIterable = context.hashStreamer.stream(
    cid.multihash
  )
  const carReadableStream = await streamer.asCarReadableStream(
    cid.multihash,
    verifiableBlobsAsyncIterable,
    {
      roots: [cid],
    }
  )

  if (!carReadableStream) {
    return new Response(undefined, { status: 404 })
  }

  return buildCarHTTPResponse(cid, carReadableStream, {
    ...carResponseOptions,
    fileName,
  })
}

async function httpCarIdentityCidGet() {
  const { writer, out } = CarWriter.create(cidUtils.identityCid)
  const collection = collector(out)
  await writer.close()
  return collection
}

/**
 * @param {AsyncIterable<Uint8Array>} iterable
 */
function collector(iterable) {
  const chunks = []
  const cfn = (async () => {
    for await (const chunk of iterable) {
      chunks.push(chunk)
    }
    return concatBytes(chunks)
  })()
  return cfn
}

/**
 * @param {Uint8Array[]} chunks
 */
function concatBytes(chunks) {
  const length = chunks.reduce((p, c) => p + c.length, 0)
  const bytes = new Uint8Array(length)
  let off = 0
  for (const chunk of chunks) {
    bytes.set(chunk, off)
    off += chunk.length
  }
  return bytes
}

/**
 * Get trustless content behind IPFS CID as raw bytes.
 *
 * @param {Request} request - The incoming HTTP request.
 * @param {{ hashStreamer: import('@hash-stream/streamer').HashStreamer }} context - Context object providing the hash streamer.
 * @returns {Promise<Response>} HTTP Response containing the raw content or an error.
 */
export async function httpRawGet(request, context) {
  /** @type {import('multiformats').CID} */
  let cid
  try {
    cid = await extractCidFromRequest(request)
  } catch (/** @type {any} */ err) {
    return new Response(err.message, { status: 400 })
  }

  const fileName = extractFileNameFromRequest(request)

  // Check dedicated probe paths
  if (cid.equals(cidUtils.identityCid)) {
    return buildRawHTTPResponse(cid, new Uint8Array(), {
      fileName,
    })
  }

  // Get Raw Uint8Array for response
  const verifiableBlobsAsyncIterable = context.hashStreamer.stream(
    cid.multihash
  )
  const rawUint8Array = await streamer.asRawUint8Array(
    cid.multihash,
    verifiableBlobsAsyncIterable
  )

  // Return response as either not found or raw Uint8Array
  if (!rawUint8Array) {
    return new Response(undefined, { status: 404 })
  }

  return buildRawHTTPResponse(cid, rawUint8Array, {
    fileName,
  })
}

/**
 * Build a HTTP response with the content behind a given CID in CAR format.
 *
 * @param {CID} cid - The CID of the content to serve.
 * @param {ReadableStream<Uint8Array> | Uint8Array} body - The body of data to serve.
 * @param {API.CarResponseOptions} options - Options for the CAR response.
 */
export function buildCarHTTPResponse(cid, body, options) {
  const etag = `W/"${cid}.car"`
  /* c8 ignore next 1 */
  const name = options.fileName || `${cid}.car`
  const utf8Name = encodeURIComponent(name)
  // eslint-disable-next-line no-control-regex
  const asciiName = encodeURIComponent(name.replace(/[^\x00-\x7F]/g, '_'))

  const headers = {
    // Make it clear we don't support range-requests over a car stream
    'Accept-Ranges': 'none',
    'Content-Type': `application/vnd.ipld.car; version=${
      options.version
      /* c8 ignore next 1 */
    }; order=${options.order || defaultCarParams.version}; dups=${
      /* c8 ignore next 1 */
      options.dups ? 'y' : 'n'
    }`,
    'X-Content-Type-Options': 'nosniff',
    Etag: etag,
    'Cache-Control': 'public, max-age=29030400, immutable',
    'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
    Vary: 'Accept',
  }

  return new Response(body, { headers })
}

/**
 * Build a HTTP response with the content behind a given CID in RAW format.
 *
 * @param {CID} cid - The CID of the content to serve.
 * @param {Uint8Array} body - The body of data to serve.
 * @param {API.ResponseOptions} options - Options for the RAW response.
 */
export function buildRawHTTPResponse(cid, body, options) {
  const etag = `"${cid}.raw"`
  /* c8 ignore next 1 */
  const name = options.fileName || `${cid}.bin`
  const utf8Name = encodeURIComponent(name)
  // eslint-disable-next-line no-control-regex
  const asciiName = encodeURIComponent(name.replace(/[^\x00-\x7F]/g, '_'))
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    Etag: etag,
    'Cache-Control': 'public, max-age=29030400, immutable',
    'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
    'Content-Type': 'application/vnd.ipld.raw',
    'Content-Length': String(body.byteLength),
    Vary: 'Accept, Range',
  }

  return new Response(body, { headers })
}

/* c8 ignore start */
/**
 * @param {Headers} headers
 * @returns {API.CarParams}
 */
export function getCarAcceptParams(headers) {
  const accept = headers.get('accept')
  if (!accept) return defaultCarParams

  const types = accept.split(',').map((s) => s.trim())
  const carType = types.find((t) => t.startsWith('application/vnd.ipld.car'))
  if (!carType) return defaultCarParams

  const paramPairs = carType
    .split(';')
    .slice(1)
    .map((s) => s.trim())
  const { version, order, dups } = Object.fromEntries(
    paramPairs.map((p) => p.split('=').map((s) => s.trim()))
  )

  // only CARv1
  if (version != null && version !== '1') {
    throw new Error(`unsupported accept parameter: version=${version}`)
  }
  // only yes duplicates
  if (dups && dups !== 'y') {
    throw new Error(`unsupported accept parameter: dups=${dups}`)
  }
  // only dfs or unk ordering
  if (order && order !== 'dfs' && order !== 'unk') {
    throw new Error(`unsupported accept parameter: order=${order}`)
  }

  return { version: 1, order, dups: true }
}
/* c8 ignore end */

/** @type {API.CarParams} */
const defaultCarParams = {
  version: 1,
  order: 'unk',
  dups: true,
}

/**
 * MIME types for supported response formats.
 */
export const FormatMime = {
  car: 'application/vnd.ipld.car',
  raw: 'application/vnd.ipld.raw',
}

/**
 * Resolves the requested format (either 'car' or 'raw') based on query param or Accept header.
 *
 * @param {Request} request - The incoming HTTP request.
 * @returns {'car' | 'raw' | undefined} The resolved format or undefined if none matched.
 */
export function resolveRequestedFormat(request) {
  const { searchParams } = new URL(request.url)
  const formatParam = searchParams.get('format') ?? ''
  const acceptHeader = request.headers.get('Accept') ?? ''

  if (formatParam === 'car' || acceptHeader.includes(FormatMime.car)) {
    return 'car'
  } else if (formatParam === 'raw' || acceptHeader.includes(FormatMime.raw)) {
    return 'raw'
  }
  return undefined
}

/**
 * Extracts the file name from the request's `filename` query parameter.
 *
 * @param {Request} request - The incoming HTTP request.
 * @returns {string|undefined} The filename if provided, or null.
 */
export function extractFileNameFromRequest(request) {
  const url = new URL(request.url)
  return url.searchParams.get('filename') || undefined
}

/**
 * Extracts and normalizes a CID from the request params.
 *
 * @param {Request} request - Request with potential `cid` in `params`.
 * @returns {Promise<CID>} The normalized CID.
 * @throws {Error} If CID is missing or invalid.
 */
export async function extractCidFromRequest(request) {
  const url = new URL(request.url)
  const parts = url.pathname.split('/')
  if (parts.length < 3 || parts[1] !== 'ipfs') {
    throw new Error('CID not found in URL path. Expected format: /ipfs/<cid>')
  }
  const cidStr = parts[2]
  if (!cidStr) {
    throw new Error('cid path param is not provided')
  }

  try {
    return await cidUtils.normalizeCid(cidStr)
  } catch (e) {
    throw new Error('cid path param is invalid')
  }
}
