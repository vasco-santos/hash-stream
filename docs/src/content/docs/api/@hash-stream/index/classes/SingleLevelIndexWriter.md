---
editUrl: false
next: true
prev: true
title: "SingleLevelIndexWriter"
---

Defined in: [writer/single-level.js:18](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/single-level.js#L18)

SingleLevelIndexWriter implements the Index Writer interface
and provides methods to write blobs and packs.

## Implements

## Constructors

### Constructor

> **new SingleLevelIndexWriter**(`store`): `SingleLevelIndexWriter`

Defined in: [writer/single-level.js:22](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/single-level.js#L22)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `store` | `IndexStore` | The store where the index is maintained. |

#### Returns

`SingleLevelIndexWriter`

## Methods

### addBlobs()

> **addBlobs**(`blobIndexIterable`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Defined in: [writer/single-level.js:32](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/single-level.js#L32)

Indexes a given pack of blocks.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `blobIndexIterable` | `AsyncIterable`\<`BlobIndexRecord`, `any`, `any`\> |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

## Properties

### store

> **store**: `IndexStore`

Defined in: [writer/single-level.js:23](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/single-level.js#L23)
