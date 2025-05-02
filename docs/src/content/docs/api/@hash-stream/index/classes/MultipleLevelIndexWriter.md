---
editUrl: false
next: true
prev: true
title: "MultipleLevelIndexWriter"
---

Defined in: [writer/multiple-level.js:18](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/multiple-level.js#L18)

MultipleLevelIndex implements the Index Writer interface
and provides methods to write blobs and packs.

## Implements

## Constructors

### Constructor

> **new MultipleLevelIndexWriter**(`store`): `MultipleLevelIndexWriter`

Defined in: [writer/multiple-level.js:22](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/multiple-level.js#L22)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `store` | `IndexStore` | The store where the index is maintained. |

#### Returns

`MultipleLevelIndexWriter`

## Methods

### addBlobs()

> **addBlobs**(`blobIndexIterable`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Defined in: [writer/multiple-level.js:34](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/multiple-level.js#L34)

Indexes a given pack of blocks and optionally associates them with a containing multihash.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `blobIndexIterable` | `AsyncIterable`\<`BlobIndexRecord`, `any`, `any`\> |
| `options?` | \{ `containingMultihash?`: `MultihashDigest`\<`number`\>; \} |
| `options.containingMultihash?` | `MultihashDigest`\<`number`\> |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

## Properties

### store

> **store**: `IndexStore`

Defined in: [writer/multiple-level.js:23](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/multiple-level.js#L23)
