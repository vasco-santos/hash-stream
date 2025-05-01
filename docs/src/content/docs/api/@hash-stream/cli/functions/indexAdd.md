---
editUrl: false
next: true
prev: true
title: "indexAdd"
---

> **indexAdd**(`packCid`, `filePath`, `containingCid?`, `opts?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Defined in: [index.js:28](https://github.com/vasco-santos/hash-stream/blob/main/packages/cli/src/index.js#L28)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `packCid` | `string` |
| `filePath` | `string` |
| `containingCid?` | `string` |
| `opts?` | \{ `_`: `string`[]; `format`: `"car"`; `index-writer`: `"single-level"` \| `"multiple-level"` \| `"all"`; `store-backend?`: `"fs"` \| `"s3"`; `verbose`: `boolean`; \} |
| `opts._?` | `string`[] |
| `opts.format?` | `"car"` |
| `opts.index-writer?` | `"single-level"` \| `"multiple-level"` \| `"all"` |
| `opts.store-backend?` | `"fs"` \| `"s3"` |
| `opts.verbose?` | `boolean` |

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>
