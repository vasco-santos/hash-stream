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

const rawUint8Array = streamer.asRawUint8Array(
  CID.createV1(RawCode, targetMultihash),
  verifiableBlobsAsyncIterable
)
```

**Parameters:**

- `cid` (`CID`) – The target CID.
- `stream` (`AsyncIterable<VerifiableBlob>`) – Stream of blobs to search through.

**Returns:** `Promise<Uint8Array | undefined>`

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

const rawUint8Array = streamer.asCarReadableStream(
  CID.createV1(dagPbCode, containingMultihash),
  verifiableBlobsAsyncIterable
)
```

**Parameters:**

- `cid` (`CID`) – The containing CID or the pack CID of the CAR file.
- `stream` (`AsyncIterable<VerifiableBlob>`) – Stream of verifiable blobs.
- `options` (optional):
  - `targetMultihashCodec` (`number`) – CID codec to use for the matching blob. Defaults to `DAGPB` (0x70).

**Returns:** `Promise<ReadableStream<Uint8Array> | undefined>`

---

### `http.buildCarHTTPResponse`

Generates an HTTP `Response` object with headers set to serve a CAR file download.

```ts
import { http: { buildCarHTTPResponse } } from '@hash-stream/utils/trustless-ipfs-gateway'
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
import { http: { buildRawHTTPResponse } } from '@hash-stream/utils/trustless-ipfs-gateway'
```

**Parameters:**

- `cid` (`CID`) – CID being served.
- `body` (`Uint8Array`) – The raw content.
- `options` (`ResponseOptions`):
  - `fileName?` (`string`) – Suggested filename.

**Returns:** `Response`

---

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
