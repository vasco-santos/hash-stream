<p align="center">
  <img src="../../assets/name-and-logo.png" alt="Hash Stream Logo" width="50%"/>
</p>

<h1 align="center">Command line interface</h1>

## Getting started

Install the CLI from npm (**requires Node 20 or higher**):

```console
npm install -g @hash-stream/cli
```

## Usage

There are a few Usage guides provided in this repository:

- Basic [Usage Guide](./BASIC_USAGE.md)
- [Index previously generated CAR files](./PREVIOUSLY_GENERATED_CAR_INDEXING_USAGE.md)
- [Custom store backend](./STORE_BACKEND_USAGE.md)
- Setting the global `--verbose` option in the CLI improves transparency over what happens when each command runs

## Commands

- **Pack**
  - [`pack write`](#pack-write-filepath)
  - [`pack extract`](#pack-extract-targetcid-filepath)
  - [`pack clear`](#pack-clear)
- **Index**
  - [`index add`](#index-add-packcid-filepath-containingcid)
  - [`index find records`](#index-find-records-targetcid-containingcid)
  - [`index clear`](#index-clear)
- **Streamer**
  - [`streamer dump`](#streamer-dump-targetcid-filepath-containingcid)

---

### `hash-stream pack write <filePath>`

Writes the given file blob into a set of verifiable packs, stores them, and optionally indexes them.

#### Examples:

```sh
hash-stream pack write some-file.ext -iw multiple-level
hash-stream pack write some-file.ext -iw single-level
```

#### Options:

- `-f, --format` Specifies the pack format (default: `"car"` for [Content Addressable aRchives](https://ipld.io/specs/transport/car/)).
- `-ps, --pack-size` Defines the maximum pack size in bytes (default: `MAX_PACK_SIZE`).
- `-iw, --index-writer` Specifies the indexing writer implementation, which can be `"single-level"`, `"multiple-level"`, `"none"` or `"all"` (default: `"multiple-level"`).
- `-sb, --store-backend` Selects the pack storage backend to use (`fs` or `s3`).

---

### `hash-stream pack extract <targetCid> [filePath]`

Extracts Packs from the store and writes them to a file in the given path.

#### Examples:

```sh
hash-stream pack extract bafk... some-file.car
```

#### Options:

- `-f, --format` Specifies the pack format (default: `"car"` for [Content Addressable aRchives](https://ipld.io/specs/transport/car/)).
- `-sb, --store-backend` Selects the pack storage backend to use (`fs` or `s3`).

---

### `hash-stream pack clear`

Clear all packs stored.

#### Examples:

```sh
hash-stream pack clear
```

---

### `hash-stream index add <packCid> <filePath> [containingCid]`

Add Index record for the given verifiable pack using the specified index writer.

#### Examples:

```sh
hash-stream index add bag... pack.car bafy... -iw multiple-level
hash-stream index add bag... pack.car -iw single-level
```

#### Options:

- `-iw, --index-writer` Indexing writer implementation: "single-level" or "multiple-level" or "all" (default: `multiple-level`)
- `-f, --format` Specifies the pack format (default: `"car"` for [Content Addressable aRchives](https://ipld.io/specs/transport/car/)).
- `-sb, --store-backend` Selects the storage backend to use (`fs` or `s3`).

---

### `index find records <targetCid> [containingCid]`

Find index records of a given blob/pack/containing by its CID, written using a specified index writer.

#### Examples:

```sh
hash-stream index find records bafk...
hash-stream index find records bafk... bafy...
```

#### Options:

- `-sb, --store-backend` Selects the storage backend to use (`fs` or `s3`).

---

### `hash-stream index clear`

Clear all index records stored.

#### Examples:

```sh
hash-stream index clear
```

---

### `hash-stream streamer dump <targetCid> <filePath> [containingCid]`

Dump the blob data associated with the given target CID from stored Packs based on the known index records.
The data is extracted and written to the specified file path in the selected Pack format.

#### Examples:

```sh
hash-stream streamer dump bafy... /usr/dumps/baf...car
```

#### Options:

- `-f, --format` Specifies the pack format to use: "car" or "raw" (default: "car").
- `-sb, --store-backend` Selects the storage backend to use (`fs` or `s3`).

## Global Options

Some options are available for all commands:

### -v, --verbose

Prints extra information about what the CLI is doing behind the scenes.
Useful for debugging or better understanding internal operations.

#### Examples:

```sh
hash-stream pack write some-file.ext --verbose
```

By default, verbose output is disabled.

## Store Backend Configuration

`hash-stream` supports two types of storage backends for storing and retrieving Packs and Indexes:

- `fs` (default): local filesystem-based storage
- `s3`: S3-like remote storage

You can configure the backend either via CLI flags or environment variables.

### Choosing a Store Backend

You can set the backend using the `--store-backend` flag on commands that support it:

```sh
pack write file.ext --store-backend fs     # use filesystem (default)
pack write file.ext --store-backend s3     # use S3-like remote storage
```

Or by setting the environment variable globally:

```sh
export HASH_STREAM_STORE_BACKEND=s3
```

If both are provided, the CLI flag takes precedence.

See [STORE_BACKEND_USAGE](./STORE_BACKEND_USAGE.md) for usage help.

## FAQ

### Where is my configuration and indexes stored?

In the system default user config directory:

- macOS: `~/Library/Preferences/hash-stream`
- Windows: `%APPDATA%\hash-stream\Config` (for example, `C:\Users\USERNAME\AppData\Roaming\hash-stream\Config`)
- Linux: `~/.config/hash-stream` (or `$XDG_CONFIG_HOME/hash-stream`)

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
