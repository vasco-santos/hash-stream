/**
 * Transforms an async iterator to blob index record.
 *
 * @param {AsyncIterable<import('@ipld/car/indexer').BlockIndex>} source
 * @param {import('multiformats').CID} locationCID
 * @returns {AsyncIterable<{ multihash: import('multiformats').MultihashDigest, location: import('multiformats').MultihashDigest, offset: number, length: number }>}
 */
export async function* carBlockIndexToBlobIndexRecordIterable(
  source,
  locationCID
) {
  for await (const { cid, blockOffset, blockLength } of source) {
    yield {
      multihash: cid.multihash,
      location: locationCID.multihash,
      offset: blockOffset,
      length: blockLength,
    }
  }
}
