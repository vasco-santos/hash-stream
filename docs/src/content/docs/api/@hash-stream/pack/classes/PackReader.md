---
editUrl: false
next: true
prev: true
title: "PackReader"
---

Defined in: [reader.js:8](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/reader.js#L8)

PackReader is responsible for reading packs from the store.

## Implements

## Constructors

### Constructor

> **new PackReader**(`storeStreamer`): `PackReader`

Defined in: [reader.js:13](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/reader.js#L13)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `storeStreamer` | `PackStoreStreamer` |

#### Returns

`PackReader`

## Methods

### stream()

> **stream**(`target`, `ranges?`): `AsyncIterable`\<`VerifiableEntry`, `any`, `any`\>

Defined in: [reader.js:22](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/reader.js#L22)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `string` \| `MultihashDigest`\<`number`\> |
| `ranges?` | `object`[] |

#### Returns

`AsyncIterable`\<`VerifiableEntry`, `any`, `any`\>

## Properties

### storeStreamer

> **storeStreamer**: `PackStoreStreamer`

Defined in: [reader.js:14](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/reader.js#L14)
