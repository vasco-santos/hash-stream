---
editUrl: false
next: true
prev: true
title: "PackWriter"
---

Defined in: [writer.js:13](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/writer.js#L13)

PackWriter is responsible for creating and storing packs from a given
blob, as well as managing the index data and storing it.

## Implements

## Constructors

### Constructor

> **new PackWriter**(`storeWriter`, `options?`): `PackWriter`

Defined in: [writer.js:21](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/writer.js#L21)

Constructs a PackWriter instance to handle pack storage and indexing.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `storeWriter` | `PackStore` |
| `options?` | \{ `indexWriters?`: `IndexWriter`[]; \} |
| `options.indexWriters?` | `IndexWriter`[] |

#### Returns

`PackWriter`

## Methods

### write()

> **write**(`blob`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<\{ `containingMultihash`: `MultihashDigest`; `packsMultihashes`: `MultihashDigest`\<`number`\>[]; \}\>

Defined in: [writer.js:35](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/writer.js#L35)

Writes the given blob into a set of packs and stores them.
The function will parallelize the storing of packs and writing the index data if
an Index Writer is set.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `blob` | `BlobLike` |
| `options?` | `PackWriterWriteOptions` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<\{ `containingMultihash`: `MultihashDigest`; `packsMultihashes`: `MultihashDigest`\<`number`\>[]; \}\>

## Properties

### indexWriters

> **indexWriters**: `undefined` \| `IndexWriter`[]

Defined in: [writer.js:23](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/writer.js#L23)

***

### storeWriter

> **storeWriter**: `PackStore`

Defined in: [writer.js:22](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/writer.js#L22)
