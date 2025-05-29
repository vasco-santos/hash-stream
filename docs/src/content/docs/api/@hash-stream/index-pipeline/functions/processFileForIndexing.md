---
editUrl: false
next: true
prev: true
title: "processFileForIndexing"
---

> **processFileForIndexing**(`fileStore`, `indexWriters`, `indexFormat`, `fileReference`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`undefined` \| `MultihashDigest`\<`number`\>\>

Defined in: [index.js:52](https://github.com/vasco-santos/hash-stream/blob/main/packages/index-pipeline/src/index.js#L52)

Scheduler consumer function where a file reference is fetched from the store,
processed, and then written to the index store.
This function is designed to be used in a queue consumer that listens for
messages from the index scheduler. It fetches the file reference from the file store,
processes the file content using the specified index format, and writes the processed
content to the index store using the provided index writer.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fileStore` | `FileStore` |
| `indexWriters` | `IndexWriter`[] |
| `indexFormat` | `string` |
| `fileReference` | `string` |
| `options?` | `ProcessFileForIndexingOptions` |

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`undefined` \| `MultihashDigest`\<`number`\>\>
