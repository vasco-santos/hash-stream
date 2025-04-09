import * as API from './api.js'
import { CID } from 'multiformats/cid'

/**
 * Build a HTTP response with the content behind a given CID in CAR format.
 *
 * @param {CID} cid - The CID of the content to serve.
 * @param {ReadableStream<Uint8Array>} body - The body of data to serve.
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
