# @hash-stream/verifiable-pack

> The verifiable-pack client to use hash-stream

## Install

```sh
npm install @hash-stream/verifiable-pack
```

## Usage

### Creating Packs

When aiming to create packs (as CAR files) from a given Blob like (object with a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)), one can use `createPacks` function. It returns an object with a `packStream` Async Generator that yields verifiable CAR packs and a `containingPromise` Promise that resolves to a `containingMultihash` representing the blob.

```js
import { PackWriter } from '@hash-stream/verifiable-pack'
import { base58btc } from 'multiformats/bases/base58'

async function main() {
  const blob = new Blob(['Hello, world!'])

  const { packStream, containingPromise } = createPacks(blob, { type: 'car' })

  const packs = []
  for await (const pack of packStream) {
    packs.push(pack)
    console.log(
      'Generated pack multihash (base58btc):',
      base58btc.encode(pack.multihash.bytes)
    )
    console.log('Generated pack bytes', pack.bytes)
  }

  const containingMultihash = await containingPromise
  console.log(
    'Containing multihash (base58btc):',
    base58btc.encode(containingMultihash.bytes)
  )
}

main().catch(console.error)
```

### Writing Packs

Created packs from a given Blob like (object with a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)), can be stored into a given Pack Store, as well as optionally indexed if an index writer is provided.

```js
import { MultipleLevelIndex } from '@hash-stream/index'
import { FSContainingIndexStore } from '@hash-stream/index/store/fs-containing'
import { PackWriter } from 'verifiable-pack'
import { FSPackStore } from 'verifiable-pack/store/fs' // Example file system store

async function main() {
  // Initialize the stores
  const indexStore = new FSContainingIndexStore('/path/to/index-store')
  const packStore = new FsStore('/path/to/pack-store')

  // Initialize the index
  const index = new MultipleLevelIndex(indexStore)
  const packWriter = new PackWriter(packStore, {
    indexWriter: index,
  })

  // Get Blob
  const blob = new Blob(['Hello, world!']) // Example BlobLike object

  // Write Blob as packs
  const { containingMultihash, packsMultihashes } = await packWriter.write(
    blob,
    {
      type: 'car',
      // example number of bytes blob can be sharded in different packs
      shardSize: 10_000_000,
    }
  )

  for (const packMultihash of packsMultihashes) {
    console.log(
      'Pack multihash (base58btc):',
      base58btc.encode(packMultihash.bytes)
    )
  }

  const containingMultihash = await containingPromise
  console.log(
    'Containing multihash (base58btc):',
    base58btc.encode(containingMultihash.bytes)
  )
}

main().catch(console.error)
```

### Using a Custom Store

The Pack Store must implement the PackStore interface. A store must define the following methods:

```ts
export interface PackStore extends PackStoreWriter, PackStoreReader {}

export interface PackStoreWriter {
  put(hash: MultihashDigest, data: Uint8Array): Promise<void>
}

export interface PackStoreReader {
  get(hash: MultihashDigest): Promise<Uint8Array | null>
}
```

#### Example: Implementing a Custom Store

```js
class MemoryStore {
  constructor() {
    this.storage = new Map()
  }

  async put(hash, data) {
    this.storage.set(hash.toString(), data)
  }

  async get(hash) {
    return this.storage.get(hash.toString()) || null
  }
}

const store = new MemoryStore()
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
