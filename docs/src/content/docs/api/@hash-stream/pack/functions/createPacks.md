---
editUrl: false
next: true
prev: true
title: "createPacks"
---

> **createPacks**(`blob`, `options?`): `object`

Defined in: [index.js:18](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/src/index.js#L18)

Create a set of packs from a blob.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `blob` | `BlobLike` |
| `options?` | `CreateOptions` |

## Returns

`object`

### containingPromise

> **containingPromise**: [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`MultihashDigest`\<`number`\>\>

### packStream

> **packStream**: [`AsyncGenerator`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator)\<`VerifiableEntry`, `void`, `void`\>
