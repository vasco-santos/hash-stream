import { equals } from 'uint8arrays'
import { CarWriter } from '@ipld/car'
import { CID } from 'multiformats/cid'
import { code as RawCode } from 'multiformats/codecs/raw'

export const DAGPB_CODE = 0x70

/**
 * Transforms a stream of VerifiableBlobs into a Raw bytes.
 *
 * @param {import('multiformats').MultihashDigest} multihashDigest
 * @param {AsyncIterable<import('@hash-stream/streamer/types').VerifiableBlob>} stream
 * @returns {Promise<Uint8Array | undefined>} A ReadableStream containing the data from the stream, or null if no data was written.
 */
export async function asRawUint8Array(multihashDigest, stream) {
  let rawBytes
  for await (const { multihash, bytes } of stream) {
    if (equals(multihash.bytes, multihashDigest.bytes)) {
      rawBytes = bytes
      break
    }
  }

  if (!rawBytes) {
    return undefined
  }

  return rawBytes
}

/**
 * Transforms a stream of VerifiableBlobs into a CARv1 ReadableStream.
 *
 * @param {import('multiformats').MultihashDigest} multihashDigest
 * @param {AsyncIterable<import('@hash-stream/streamer/types').VerifiableBlob>} stream
 * @param {object} [options]
 * @param {CID[] | CID} [options.roots]
 * @param {number} [options.targetMultihashCodec]
 * @returns {Promise<ReadableStream<Uint8Array> | undefined>} A ReadableStream containing the data from the stream, or null if no data was written.
 */
export async function asCarReadableStream(
  multihashDigest,
  stream,
  options = {}
) {
  /* c8 ignore next 5 */
  const roots = Array.isArray(options.roots)
    ? options.roots
    : options.roots
    ? [options.roots]
    : []
  const { writer, out } = CarWriter.create(roots)

  let wroteSomething = false
  /* c8 ignore next 2 */
  /** @type {() => void} */
  let resolveFirstWrite = () => {}

  /** @type {Promise<void>} */
  const firstWrite = new Promise((resolve) => {
    resolveFirstWrite = resolve
  })

  ;(async () => {
    try {
      for await (const { multihash, bytes } of stream) {
        // Mark that something was written
        if (!wroteSomething) {
          wroteSomething = true
          resolveFirstWrite()
        }

        if (equals(multihash.bytes, multihashDigest.bytes)) {
          const asCurrentRoot = roots.find((r) =>
            equals(r.multihash.bytes, multihash.bytes)
          )
          if (asCurrentRoot) {
            // If the multihash is one of the roots, we can use it directly
            await writer.put({ cid: asCurrentRoot, bytes })
            continue
            /* c8 ignore next 9 */
          } else {
            await writer.put({
              cid: CID.createV1(
                options.targetMultihashCodec || DAGPB_CODE,
                multihash
              ),
              bytes,
            })
          }
        } else {
          const rawCid = CID.createV1(RawCode, multihash)
          await writer.put({ cid: rawCid, bytes })
        }
      }
    } finally {
      if (!wroteSomething) {
        resolveFirstWrite()
      }
      await writer.close()
    }
  })()

  // Wait until either something is written or the stream ends to see if we found the content
  await firstWrite
  if (!wroteSomething) {
    return undefined
  }
  return toReadableStream(out)
}

/**
 * Converts an async iterable into a ReadableStream.
 *
 * @template T
 * @param {AsyncIterable<T>} iterable - An async iterable to be streamed.
 * @returns {ReadableStream<T>} A ReadableStream that yields values from the iterable.
 */
export function toReadableStream(iterable) {
  /** @type {AsyncIterator<T>} */
  let iterator

  return new ReadableStream({
    async pull(controller) {
      iterator = iterator || iterable[Symbol.asyncIterator]()
      const { value, done } = await iterator.next()
      if (done) return controller.close()
      controller.enqueue(value)
    },
  })
}
