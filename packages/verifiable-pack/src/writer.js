import * as API from './api.js'

import { CarIndexer } from '@ipld/car'

import { create } from './index.js'

export class PackWriter {
  /**
   *
   * @param {API.PackStore} store
   * @param {object} [options]
   * @param {API.IndexWriter} [options.indexWriter]
   */
  constructor(store, { indexWriter } = {}) {
    this.store = store
    this.indexWriter = indexWriter
  }

  /**
   * Create a set of verifiable pack from a blob and store them.
   *
   * @param {import('@web3-storage/upload-client/types').BlobLike} blob
   * @param {API.PackWriterWriteOptions} [options]
   */
  async write(blob, options) {
    const { packStream, containingPromise } = create(blob, options)

    const indexEntries = []
    const packsMultihashes = []

    for await (const { multihash, bytes } of packStream) {
      // create index for the pack
      if (this.indexWriter) {
        const blobIterable = await CarIndexer.fromBytes(bytes)
        for await (const blob of blobIterable) {
          indexEntries.push({
            multihash: blob.cid.multihash,
            location: multihash,
            offset: blob.blockOffset,
            length: blob.blockLength,
          })
        }
      }
      await this.store.put(multihash, bytes)
      packsMultihashes.push(multihash)
    }

    const containingMultihash = await containingPromise
    if (this.indexWriter) {
      await this.indexWriter.addBlobs(
        (async function* () {
          for (const entry of indexEntries) {
            yield entry
          }
        })(),
        options?.notIndexContaining ? {} : { containingMultihash }
      )
    }
    return { containingMultihash, packsMultihashes }
  }
}
