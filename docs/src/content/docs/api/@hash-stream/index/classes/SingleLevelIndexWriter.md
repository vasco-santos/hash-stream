---
editUrl: false
next: true
prev: true
title: "SingleLevelIndexWriter"
---

Defined in: [writer/single-level.js:17](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/single-level.js#L17)

SingleLevelIndexWriter implements the Index Writer interface
and provides methods to write blobs and packs.

## Implements

## Constructors

### Constructor

> **new SingleLevelIndexWriter**(`store`): `SingleLevelIndexWriter`

Defined in: [writer/single-level.js:21](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/single-level.js#L21)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `store` | `IndexStore` | The store where the index is maintained. |

#### Returns

`SingleLevelIndexWriter`

## Methods

### addBlobs()

> **addBlobs**(`blobIndexIterable`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Defined in: [writer/single-level.js:31](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/single-level.js#L31)

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

Defined in: [writer/single-level.js:22](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/src/writer/single-level.js#L22)
