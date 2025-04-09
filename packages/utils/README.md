# @hash-stream/utils

> Utility functions for working with [hash-stream](https://github.com/vasco-santos/hash-stream), including converting verifiable blob streams to CAR files or raw bytes and building HTTP responses with appropriate content headers.

## Install

```sh
npm install @hash-stream/utils
```

## Usage

### `trustless-ipfs-gateway`

#### `streamer.asRawUint8Array`

Converts a stream of `VerifiableBlob`s into a raw `Uint8Array` if the CID matches.

```ts
import { HashStreamer } from '@hash-stream/streamer'
import { streamer } from '@hash-stream/utils/trustless-ipfs-gateway'

// Initialize the streamer
// TODO: define indexReader and packReader
const hashStreamer = new HashStreamer(indexReader, packReader)

// TODO: Fill in multihashes to look for
const targetMultihash = // TODO
const containingMultihash = // TODO

const verifiableBlobsAsyncIterable = hashStreamer.stream(
  targetMultihash,
  { containingMultihash }
)

const rawUint8Array = await streamer.asRawUint8Array(
  targetMultihash,
  verifiableBlobsAsyncIterable
)
```

**Parameters:**

- `multihashDigest` (`MultihashDigest`) – The target multihash digest to look for in the stream.
- `stream` (`AsyncIterable<VerifiableBlob>`) – The stream of blobs to search through.

**Returns:** `Promise<Uint8Array | undefined>` – A `Uint8Array` containing the data from the stream, or `undefined` if no matching CID is found.

### `streamer.asCarReadableStream`

Converts a stream of `VerifiableBlob`s into a CARv1 `ReadableStream` containing blocks with the matching CID.

```ts
import { HashStreamer } from '@hash-stream/streamer'
import { streamer } from '@hash-stream/utils/trustless-ipfs-gateway'

const dagPbCode = 0x70

// Initialize the streamer
// TODO: define indexReader and packReader
const hashStreamer = new HashStreamer(indexReader, packReader)

// TODO: Fill in multihashes to look for
const containingMultihash = // TODO

const verifiableBlobsAsyncIterable = hashStreamer.stream(
  containingMultihash
)

const rawUint8Array = await streamer.asCarReadableStream(
  containingMultihash,
  verifiableBlobsAsyncIterable
)
```

**Parameters:**

- `multihashDigest` (`MultihashDigest`) – The target multihash digest to look for in the stream.
- `stream` (`AsyncIterable<VerifiableBlob>`) – The stream of verifiable blobs to search through.
- `options` (optional):
  - `roots` (`CID[] | CID`) – The roots of the CAR file. If omitted, it defaults to an empty array.
  - `targetMultihashCodec` (`number`) – CID codec to use for the matching blob. Defaults to `DAGPB` (0x70).

**Returns:** `Promise<ReadableStream<Uint8Array> | undefined>` – A `ReadableStream` containing the data from the stream, or `undefined` if no matching content is found.

---

### `http.ipfsGet`

Handles a trustless IPFS HTTP request by detecting the requested format (`car` or `raw`) and delegating to the appropriate handler.

```js
import { http } from '@hash-stream/utils/trustless-ipfs-gateway'

const response = await http.ipfsGet(request, context)
```

**Parameters:**

- `request` (`Request`) – The incoming HTTP request.
- `context` (`{ hashStreamer: HashStreamer }`) – Context object providing the hash streamer.

**Returns:** `Promise<Response>` – HTTP Response containing either a CAR or raw IPLD content, or an error.

---

### `http.httpCarGet`

Gets trustless content behind IPFS CID as a CAR file.

```js
import { http } from '@hash-stream/utils/trustless-ipfs-gateway'

const response = await http.httpCarGet(request, context)
```

**Parameters:**

- `request` (`Request`) – The incoming HTTP request.
- `context` (`{ hashStreamer: HashStreamer }`) – Context object providing the hash streamer.

**Returns:** `Promise<Response>` – HTTP Response containing the CAR stream or an error.

---

### `http.httpRawGet`

Gets trustless content behind IPFS CID as raw bytes.

```js
import { http } from '@hash-stream/utils/trustless-ipfs-gateway'

const response = await http.httpRawGet(request, context)
```

**Parameters:**

- `request` (`Request`) – The incoming HTTP request.
- `context` (`{ hashStreamer: HashStreamer }`) – Context object providing the hash streamer.

**Returns:** `Promise<Response>` – HTTP Response containing the raw content or an error.

---

### `http.buildCarHTTPResponse`

Generates an HTTP `Response` object with headers set to serve a CAR file download.

```ts
import { http } from '@hash-stream/utils/trustless-ipfs-gateway'

const httpResponse = http.buildCarHTTPResponse(cid, body, options)
```

**Parameters:**

- `cid` (`CID`) – CID being served.
- `body` (`ReadableStream<Uint8Array>`) – The body stream.
- `options` (`CarResponseOptions`):
  - `fileName?` (`string`) – Suggested filename.
  - `version` (`number`) – CAR format version.
  - `order?` (`string`) – Block order.
  - `dups?` (`boolean`) – Whether to allow duplicates.

**Returns:** `Response`

---

### `http.buildRawHTTPResponse`

Generates an HTTP `Response` object with headers set to serve raw IPLD data.

```ts
import { http } from '@hash-stream/utils/trustless-ipfs-gateway'

const httpResponse = http.buildRawHTTPResponse(cid, body, options)
```

**Parameters:**

- `cid` (`CID`) – CID being served.
- `body` (`Uint8Array`) – The raw content.
- `options` (`ResponseOptions`):
  - `fileName?` (`string`) – Suggested filename.

**Returns:** `Response`

---

### `http.getCarAcceptParams`

Parses the Accept header from an HTTP request to extract CAR format parameters like version, block order, and duplicates. Defaults to CARv1 with unknown order and duplicates allowed if no or invalid parameters are provided.

```ts
import { http } from '@hash-stream/utils/trustless-ipfs-gateway'

const carParams = http.getCarAcceptParams(request.headers)
```

**Parameters:**

- headers (`Headers`) – The Headers object from the HTTP request.

**Returns**: `CarParams`

- `version (1)` – The CAR format version (only 1 supported).
- `order? ('dfs' | 'unk')` – Block traversal order.
- `dups (true)` – Whether duplicates are allowed (only true supported).

**Throws:** Error – If the client requests an unsupported version, order, or duplicate flag.

---

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
