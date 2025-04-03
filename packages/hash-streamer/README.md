# @hash-stream/hash-streamer

> The hash-streamer client to use hash-stream

## Install

```sh
npm install @hash-stream/hash-streamer
```

## Usage

This usage guides takes into account that the Pack Store and Index Store used by the `hash-streamer` implementation to stream data from are populated with the multihashes to be requested. If not the case, please see the documentation for `pack` and `index` packages first.

```js
import { HashStreamer } from '@hash-stream/hash-streamer'
import { IndexReader } from '@hash-stream/index/reader'
import { FSIndexStore } from '@hash-stream/index/store/fs'
import { FSPackStore } from '@hash-stream/pack/store/fs'
import { PackReader } from '@hash-stream/pack'

async function main() {
  // Initialize the stores
  const indexStore = new FSIndexStore('/path/to/index-store')
  const packStore = new FSPackStore('/path/to/pack-store')

  // Initialize the readers
  const indexReader = new IndexReader(indexStore)
  const packReader = new PackReader(packStore)

  // Initialize the streamer
  const hashStreamer = new HashStreamer(indexReader, packReader)

  // Fill in multihashes to look for
  const targetMultihash = // TODO
  const containingMultihash = // TODO

  // Iterate over the verifiable entries and reconstruct the content
  for await (const { multihash, bytes } of hashStreamer.stream(
    targetMultihash,
    { containingMultihash }
  )) {
    // TODO
  }
}

main().catch(console.error)
```

One of the typical ways to transport the verifiable entries is via CAR files. A [CarWriter](https://github.com/ipld/js-car?tab=readme-ov-file#CarWriter) may be used to write the content of the stream into.

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
