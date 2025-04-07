# @hash-stream/index

> The index client to use hash-stream

## Install

```sh
npm install @hash-stream/index
```

## Usage

### Reader

```js
import { IndexReader } from '@hash-stream/index/reader'
// Using a FS Index Store with Containing format
import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'

async function main() {
  // Initialize the stores
  const indexStore = new FSContainingIndexStore('/path/to/index-store')

  // Initialize the readers
  const indexReader = new IndexReader(indexStore)

  // Get records for a given target
  const targetMultihash = // TODO
  const containingMultihash = // TODO

  const indexRecords = []
  for await (const record of indexReader.findRecords(targetMultihash, {
    containingMultihash
  })) {
    indexRecords.push(record)
  }

  console.log(indexRecords)
  // [
  //   {
  //     multihash: MultihashDigest,
  //     location: MultihashDigest,
  //     offset: number,
  //     length: number,
  //     type: IndexRecordType
  //   }
  // ]
}

main().catch(console.error)
```

The retrieved index records can be used to fetch the bytes behind a given multihash.

### Writer

Many implementations of an **IndexWriter** may be created. This repository includes a `MultipleLevelIndexWriter` and a `SingleLevelIndexWriter`.

You can read more about their differences in the [Index writer spec](./specs/index-writer.md).

```js

import { MultipleLevelIndexWriter } from '@hash-stream/index/writer/multiple-level'
import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'

async function main() {
  // Initialize the stores
  const indexStore = new FSContainingIndexStore('/path/to/index-store')

  // Initialize the index writer
  const indexWriter = new MultipleLevelIndexWriter(indexStore)

  // Add an array of blobs associated with a Pack
  const packMultihash = // TODO
  const containingMultihash = // TODO
  const blobs = // TODO
    // [
    //   {
    //     multihash: MultihashDigest,
    //     offset: Number,
    //     length: Number,
    //   }
    // ]

  await indexWriter.addBlobs(
    (async function* () {
      for (const blob of blobs) {
        yield {
          multihash: blob.multihash,
          // Where the blob is located
          location: packMultihash,
          offset: blob.offset,
          length: blob.length,
        }
      }
    })(),
    { containingMultihash: containing.multihash }
  )
}

main().catch(console.error)
```

## Stores

### Exported Stores

This package already exports a few stores compatible with `IndexStore` Interface:

- File system store: `store/fs.js`
- Memory store: `store/memory.js`
- S3-like Cloud Object store: `store/s3-like.js`
- Cloudflare worker bucket like: `store/cf-worker-bucket.js`

#### File System store

Stores records within the host file system, by providing the path for a directory.

```js
import fs from 'fs'
import path from 'path'
import os from 'os'

import { FSIndexStore } from '@hash-stream/index/store/fs'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-index-store'))
const indexStore = new FSIndexStore(tempDir)
```

#### Memory System store

Stores records within a Map in memory. This is a good store to use for testing.

```js
import { MemoryIndexStore } from '@hash-stream/index/store/memory'

const indexStore = new MemoryIndexStore()
```

#### S3-like Cloud Object store

Stores records using a S3 compatible Cloud Storage solution like S3 or R2.

```js
import fs from 'fs'
import path from 'path'
import os from 'os'

import { S3Client } from '@aws-sdk/client-s3'
import { S3LikeIndexStore } from '@hash-stream/index/store/s3-like'

const client = new S3Client({
  // TODO: setup client options according to target
})
const bucketName = 'index-store'
const indexStore = new S3LikeIndexStore({
  bucketName,
  client,
})
```

#### Cloudflare worker bucket like

Stores records using a Cloudflare worker bucket reference.

```js
import { CloudflareWorkerBucketIndexStore } from '@hash-stream/index/store/s3-like'

// Worker bindings R2 Bucket
const bucket = // TODO

const packStore = new CloudflareWorkerBucketIndexStore({
  bucket
})
```

## Custom implementations

Given `hash-stream` provides a set of building blocks to run a HTTP server for content-addressable data, anyone is welcome to write new implementations for each of the building blocks based on their specifications. This library also exports a test suite to verify if the implementation will be comaptible with the remaining pieces. Here is how you can use it:

```js
import { test } from '@hash-stream/index/test'

// Run tests for a reader implementation
await test.reader(readerName, () => getNewReaderImplementation())

// Run tests for a store implementation
await test.store(readerName, () => getNewStoreImplementation())
```

### Using a Custom Store

Other implementations of a Store may be implemented according to the storage backend intended. The Pack Store must implement the `IndexStore` interface, or separately a `IndexStoreReader` and a `IndexStoreWriter`. A store must define the following methods:

```ts
export interface IndexStore extends IndexStoreReader, IndexStoreWriter {}

export interface IndexStoreWriter {
  add(entries: AsyncIterable<IndexRecord>): Promise<void>
}

export interface IndexStoreReader {
  get(hash: MultihashDigest): AsyncIterable<IndexRecord>
}

// An index record has the necessary metadata to find the location
// where the bytes behind a given `MultihashDigest` rest.
export interface IndexRecord {
  // MultihashDigest identifiying the record
  multihash: MultihashDigest
  // Type of the record
  type: IndexRecordType
  // hash digest of the location or Path
  location: MultihashDigest
  // length of the data
  length?: number
  // offset of the data in the location byte stream
  offset?: number
  // associated records
  subRecords: Array<IndexRecord>
}
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
