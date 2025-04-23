<p align="center">
  <img src="../../assets/name-and-logo.png" alt="Hash Stream Logo" width="50%"/>
</p>

<h1 align="center">The pack library to use hash-stream</h1>

## Install

```sh
npm install @hash-stream/pack
```

## Usage

### Creating Packs

When aiming to create packs (as CAR files) from a given Blob like (object with a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)), one can use `createPacks` function. It returns an object with a `packStream` Async Generator that yields verifiable CAR packs and a `containingPromise` Promise that resolves to a `containingMultihash` representing the blob.

```js
import { createPacks } from '@hash-stream/pack'
import { base58btc } from 'multiformats/bases/base58'

async function main() {
  const blob = new Blob(['Hello, world!'])

  const { packStream, containingPromise } = createPacks(blob, { type: 'car' })

  const packs = []
  for await (const pack of packStream) {
    packs.push(pack)
    console.log(
      'Generated pack multihash (base58btc):',
      base58btc.encode(pack.multihash.bytes)
    )
    console.log('Generated pack bytes', pack.bytes)
  }

  const containingMultihash = await containingPromise
  console.log(
    'Containing multihash (base58btc):',
    base58btc.encode(containingMultihash.bytes)
  )
}

main().catch(console.error)
```

### Writing Packs

Created packs from a given Blob like (object with a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)), can be stored into a given Pack Store, as well as optionally indexed if an index writer is provided.

```js
import { base58btc } from 'multiformats/bases/base58'

// Using multiple level index writer implementation
import { MultipleLevelIndexWriter } from '@hash-stream/index/writer/multiple-level'
import { FSIndexStore } from '@hash-stream/index/store/fs'
import { PackWriter } from '@hash-stream/pack'
import { FSPackStore } from '@hash-stream/pack/store/fs' // Example file system store

async function main() {
  // Initialize the stores
  const indexStore = new FSIndexStore('/path/to/index-store')
  const packStore = new FsStore('/path/to/pack-store')

  // Initialize the index writer
  const indexWriter = new MultipleLevelIndexWriter(indexStore)
  const packWriter = new PackWriter(packStore, {
    indexWriter,
  })

  // Get Blob
  const blob = new Blob(['Hello, world!']) // Example BlobLike object

  // Write Blob as packs
  const { containingMultihash, packsMultihashes } = await packWriter.write(
    blob,
    {
      type: 'car',
      // example number of bytes blob can be sharded in different packs
      shardSize: 10_000_000,
    }
  )

  for (const packMultihash of packsMultihashes) {
    console.log(
      'Pack multihash (base58btc):',
      base58btc.encode(packMultihash.bytes)
    )
  }

  const containingMultihash = await containingPromise
  console.log(
    'Containing multihash (base58btc):',
    base58btc.encode(containingMultihash.bytes)
  )
}

main().catch(console.error)
```

### Reading Packs

```ts
import { PackReader } from '@hash-stream/pack'
import { FSPackStore } from '@hash-stream/pack/store/fs' // Example file system store

async function main() {
  // Initialize the stores
  const packStore = new FSPackStore('/path/to/pack-store')

  // Initialize the pack reader
  const packReader = new PackReader(packStore)

  // Get pack multihash
  const packMultihash = // TODO

  const packs = []
  for await (const entry of packReader.stream(packMultihash)) {
    packs.push(entry)
  }

  // Can also fetch blobs inside a pack based on ranges provided
  const blobRanges = [
    {
      multihash: // TBD
      offset: 50,
      length: 300,
    },
    {
      multihash: // TBD
      offset: 370,
      length: 300,
    }
  ]

  const rangeEntries = []
  for await (const entry of packReader.stream(packMultihash, blobRanges)) {
    rangeEntries.push(entry)
  }
}

main().catch(console.error)
```

## Stores

### Exported Stores

This package already exports a few stores compatible with `PackStore` Interface:

- File system store: `store/fs.js`
- Memory store: `store/memory.js`
- S3-like Cloud Object store: `store/s3-like.js`
- Cloudflare worker bucket like: `store/cf-worker-bucket.js`

#### File system store

Stores records within the host file system, by providing the path for a directory.

```js
import fs from 'fs'
import path from 'path'
import os from 'os'

import { FSPackStore } from '@hash-stream/pack/store/fs.js'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-pack-store'))
const packStore = new FSPackStore(tempDir)
```

#### Memory store

Stores records within a Map in memory. This is a good store to use for testing.

```js
import { MemoryPackStore } from '@hash-stream/pack/store/memory.js'

const packStore = new MemoryPackStore()
```

##### S3-like Cloud Object store

Stores records using a S3 compatible Cloud Storage solution like S3 or R2.

```js
import { S3Client } from '@aws-sdk/client-s3'
import { S3LikePackStore } from '@hash-stream/pack/store/s3-like'

const client = new S3Client({
  // TODO: setup client options according to target
})
const bucketName = 'pack-store'
const packStore = new S3LikePackStore({
  bucketName,
  client,
})
```

##### Cloudflare worker bucket like

Stores records using a Cloudflare worker bucket reference.

```js
import { CloudflareWorkerBucketPackStore } from '@hash-stream/pack/store/s3-like'

// Worker bindings R2 Bucket
const bucket = // TODO

const packStore = new CloudflareWorkerBucketPackStore({
  bucket
})
```

## Custom implementations

Given `hash-stream` provides a set of building blocks to run a HTTP server for content-addressable data, anyone is welcome to write new implementations for each of the building blocks based on their specifications. This library also exports a test suite to verify if the implementation will be comaptible with the remaining pieces. Here is how you can use it:

```js
import { test } from '@hash-stream/pack/test'

// Run tests for a reader implementation
await test.reader(readerName, () => getNewReaderImplementation())

// Run tests for a writer implementation
await test.writer(readerName, () => getNewWriterImplementation())
```

### Using a Custom Store

Other implementations of a Store may be implemented according to the storage backend intended. The Pack Store must implement the `PackStore` interface, or separately a `PackStoreWriter` and a `PackStoreReader`. A store must define the following methods:

```ts
export interface PackStore extends PackStoreWriter, PackStoreReader {}

export interface PackStoreWriter {
  /**
   * Stores a pack file.
   *
   * @param hash - The Multihash digest of the pack.
   * @param data - The pack file bytes.
   * @returns A promise that resolves when the pack file is stored.
   */
  put(hash: MultihashDigest, data: Uint8Array): Promise<void>
}

export interface PackStoreReader {
  /**
   * Retrieves bytes of a pack file by its multihash digest.
   *
   * @param hash - The Multihash digest of the pack.
   * @returns A promise that resolves with the pack file data or null if not found.
   */
  get(hash: MultihashDigest): Promise<Uint8Array | null>

  stream(
    targetMultihash: MultihashDigest,
    ranges?: Array<{
      offset?: number
      length?: number
      multihash: MultihashDigest
    }>
  ): AsyncIterable<VerifiableEntry>
}
```

#### Example: Implementing a Custom Store

```js
class MemoryStore {
  constructor() {
    /** @type {Map<string, Uint8Array>} */
    this.storage = new Map()
  }

  async put(hash, data) {
    this.storage.set(hash.toString(), data)
  }

  async *stream(hash, ranges = []) {
    const key = hash.toString()
    const data = this.storage.get(key)
    if (!data) return

    if (ranges.length === 0) {
      yield { multihash: hash, bytes: data }
      return
    }

    for (const { multihash, offset, length } of ranges) {
      /* c8 ignore next 1 */
      const slice = data.slice(offset, length ? offset + length : undefined)
      yield { multihash, bytes: slice }
    }
  }
}

const store = new MemoryStore()
```

## Relevant Specifications

- [pack](../../specs/pack.md)
- [pack writer](../../specs/pack-writer.md)

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
