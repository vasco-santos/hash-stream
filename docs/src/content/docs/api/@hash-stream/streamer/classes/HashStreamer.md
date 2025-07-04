---
editUrl: false
next: true
prev: true
title: "HashStreamer"
---

Defined in: [index.js:12](https://github.com/vasco-santos/hash-stream/blob/main/packages/streamer/src/index.js#L12)

HashStreamer is responsible for streamming verifiable Blobs that composed a requested Multihash.

## Implements

## Constructors

### Constructor

> **new HashStreamer**(`indexReader`, `packReader`): `HashStreamer`

Defined in: [index.js:17](https://github.com/vasco-santos/hash-stream/blob/main/packages/streamer/src/index.js#L17)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `indexReader` | `IndexReader` |
| `packReader` | `PackReader` |

#### Returns

`HashStreamer`

## Methods

### stream()

> **stream**(`targetMultihash`, `options?`): `AsyncIterable`\<`VerifiableBlob`, `any`, `any`\>

Defined in: [index.js:28](https://github.com/vasco-santos/hash-stream/blob/main/packages/streamer/src/index.js#L28)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetMultihash` | `MultihashDigest`\<`number`\> |
| `options?` | `HashStreamerStreamOptions` |

#### Returns

`AsyncIterable`\<`VerifiableBlob`, `any`, `any`\>

## Properties

### indexReader

> **indexReader**: `IndexReader`

Defined in: [index.js:18](https://github.com/vasco-santos/hash-stream/blob/main/packages/streamer/src/index.js#L18)

***

### packReader

> **packReader**: `PackReader`

Defined in: [index.js:19](https://github.com/vasco-santos/hash-stream/blob/main/packages/streamer/src/index.js#L19)
