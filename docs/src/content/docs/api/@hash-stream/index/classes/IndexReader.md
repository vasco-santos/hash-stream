---
editUrl: false
next: true
prev: true
title: "IndexReader"
---

Defined in: [reader.js:13](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/reader.js#L13)

MultipleLevelIndex implements the Index Reader interface
and provides find records to locate blobs, packs nad contains.

## Implements

## Constructors

### Constructor

> **new IndexReader**(`storeReader`): `IndexReader`

Defined in: [reader.js:17](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/reader.js#L17)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `storeReader` | `IndexStoreReader` | The store reader where the index is maintained. |

#### Returns

`IndexReader`

## Methods

### findRecords()

> **findRecords**(`multihash`, `options?`): `AsyncIterable`\<`IndexRecord`, `any`, `any`\>

Defined in: [reader.js:29](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/reader.js#L29)

Find the index records of a given multihash.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `multihash` | `MultihashDigest`\<`number`\> |
| `options?` | \{ `containingMultihash?`: `MultihashDigest`\<`number`\>; \} |
| `options.containingMultihash?` | `MultihashDigest`\<`number`\> |

#### Returns

`AsyncIterable`\<`IndexRecord`, `any`, `any`\>

## Properties

### storeReader

> **storeReader**: `IndexStoreReader`

Defined in: [reader.js:18](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/reader.js#L18)
