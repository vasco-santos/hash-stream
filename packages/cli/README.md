# `hash-stream`

The `hash-stream` command line interface.

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

### `pack write <filePath>`

Writes the given file blob into a set of verifiable packs, stores them, and optionally indexes them.

#### Examples:

```sh
pack write some-file.ext -iw multiple-level
pack write some-file.ext -iw single-level
```

#### Options:

- `-f, --format` Specifies the pack format (default: `"car"`).
- `-ps, --pack-size` Defines the maximum pack size in bytes (default: `MAX_PACK_SIZE`).
- `-iw, --index-writer` Specifies the indexing writer implementation, which can be `"single-level"` or `"multiple-level"` (default: `"multiple-level"`).
- `-sb, --store-backend` Selects the storage backend to use (`fs` or `s3`).

---

### `pack extract <targetCid> [filePath]`

Extracts Packs from the store and writes them to a file in the given path.

#### Examples:

```sh
pack extract bafk... some-file.car
```

#### Options:

- `-f, --format` Specifies the pack format (default: `"car"`).
- `-sb, --store-backend` Selects the storage backend to use (`fs` or `s3`).

---

### `pack clear`

Clear all packs stored.

#### Examples:

```sh
pack clear
```

---

### `index add <packCid> <filePath> [containingCid]`

Add Index record for the given verifiable pack (CAR file) using the specified index writer.

#### Examples:

```sh
index add bag... pack.car bafy... -iw multiple-level
index add bag... pack.car -iw single-level
```

#### Options:

- `-iw, --index-writer` Indexing writer implementation: "single-level" or "multiple-level" (default: `multiple-level`)
- `-sb, --store-backend` Selects the storage backend to use (`fs` or `s3`).

---

### `index find records <targetCid> [containingCid]`

Find index records of a given blob/pack/containing by its CID, written using a specified index writer.

#### Examples:

```sh
index find records bafk... -iw single-level
index find records bafk... bafy... -iw multiple-level
```

#### Options:

- `-iw, --index-writer` Indexing writer implementation: "single-level" or "multiple-level" (default: `multiple-level`)
- `-sb, --store-backend` Selects the storage backend to use (`fs` or `s3`).

---

### `index clear`

Clear all indexes within a writer.

#### Examples:

```sh
index clear -iw multiple-level
index clear -iw single-level
```

#### Options:

- `-iw, --index-writer` Indexing writer implementation: "single-level" or "multiple-level" (default: `multiple-level`)

---

### `streamer dump <targetCid> <filePath> [containingCid]`

Dump the blob data associated with the given target CID from stored Packs based on the known index records.
The data is extracted and written to the specified file path in the selected Pack format.

#### Examples:

```sh
streamer dump bafy... /usr/dumps/baf...car
```

#### Options:

- `-f, --format` Specifies the pack format to use: "car" or "raw" (default: "car").
- `-sb, --store-backend` Selects the storage backend to use (`fs` or `s3`).

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
