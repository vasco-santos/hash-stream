<p align="center">
  <img src="../../assets/name-and-logo.png" alt="Hash Stream Logo" width="50%"/>
</p>

<h1 align="center">Pipeline for creating indexes for raw data at rest</h1>

## Install

```sh
npm install @hash-stream/index-pipeline
```

## Overview

`@hash-stream/index-pipeline` provides a modular pipeline for indexing files in a content-addressable way. It consists of interfaces and implementations for reading files from a store, scheduling indexing tasks, and processing files into indexes.

This package is ideal for cloud or local workflows that:

* need to **scan large object stores** or filesystems
* **schedule files for processing** (e.g., via a queue)
* **generate content-addressed indexes** (e.g., UnixFS link indexes) without data transformation

---

## Usage

```js
import {
  scheduleStoreFilesForIndexing,
  processFileForIndexing
} from '@hash-stream/index-pipeline/index'

import { MemoryFileStore } from '@hash-stream/index-pipeline/file-store/memory'
import { MemoryIndexScheduler } from '@hash-stream/index-pipeline/index-scheduler/memory'

const fileStore = new MemoryFileStore([...])
const scheduler = new MemoryIndexScheduler([])

// Schedule all files for indexing
await scheduleStoreFilesForIndexing(fileStore, scheduler)

// Consume and process tasks
for await (const task of scheduler.drain()) {
  await processFileForIndexing(fileStore, [...writers], 'unixfs', task.fileReference)
}
```

---

## API

### `scheduleStoreFilesForIndexing(fileStore, indexScheduler, options?)`

Lists all files from a `FileStore` and schedules them via an `IndexScheduler`.

* `fileStore`: an object implementing `FileStore`
* `indexScheduler`: an object implementing `IndexScheduler`
* `options.format`: index format (defaults to `'unixfs'`)

### `processFileForIndexing(fileStore, indexWriters, indexFormat, fileReference, options?)`

Processes a single file by:

1. retrieving it from the file store
2. processing its content into an index (e.g., UnixFS index)
3. writing the result using provided `indexWriters`

---

## Interfaces

### FileStore

```ts
interface FileStore {
  list(): AsyncIterable<FileMetadata>
  get(fileReference: string): Promise<BlobLike | null>
}
```

### IndexScheduler

```ts
interface IndexScheduler {
  add(fileReference: string, options?: IndexSchedulerAddOptions): Promise<void>
}
```

### IndexWriter

The `IndexWriter` interface is defined in `@hash-stream/index/types`. It is used to write generated index data.

---

## Provided Implementations

### FileStore

| Import Path                   | Description                           |
| ----------------------------- | ------------------------------------- |
| `file-store/memory`           | In-memory file store                  |
| `file-store/fs`               | Filesystem-backed file store          |
| `file-store/s3-like`          | S3-compatible object store (e.g., R2) |
| `file-store/cf-worker-bucket` | Cloudflare Worker-compatible store    |

### IndexScheduler

| Import Path              | Description                             |
| ------------------------ | --------------------------------------- |
| `index-scheduler/memory` | In-memory scheduler (local dev/testing) |
| `index-scheduler/sqs`    | AWS SQS-backed scheduler                |

You can mix and match any implementation of `FileStore` and `IndexScheduler`.

---

## Testing Utilities

The package exports reusable test suites to validate your own `FileStore` or `IndexScheduler` implementations:

```ts
import { runFileStoreTests, runIndexSchedulerTests } from '@hash-stream/index-pipeline/test'
```

You can use these to ensure your custom implementations behave correctly.

---

## Custom Implementations

You can provide your own implementations by adhering to the exported interfaces. Here is an example:

#### Example: Implementing a Custom File Store

```ts
import { FileStore } from '@hash-stream/index-pipeline/types'

class MyCustomStore implements FileStore {
  async *list() {
    yield { key: 'file1.txt', size: 1234 }
  }

  async get(fileReference) {
    return new Blob(['hello world'])
  }
}
```

---

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
