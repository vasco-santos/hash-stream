# `hash-stream`

The `hash-stream` command line interface.

## Getting started

Install the CLI from npm (**requires Node 20 or higher**):

```console
npm install -g @hash-stream/cli
```

## Usage

Basic [Usage Guide](./USAGE.md).

## Commands

- **Pack Management**
  - [`pack write`](#pack-write-filepath)
  - [`pack extract`](#pack-extract-targetcid-filepath)
  - [`pack clear`](#pack-clear)
- **Index Management**
  - [`index add`](#index-add-packcid-filepath-containingcid)
  - [`index find records`](#index-find-records-targetcid-containingcid)
  - [`index clear`](#index-clear)

---

### `pack write <filePath>`

Writes the given file blob into a set of verifiable packs, stores them, and optionally indexes them.

#### Examples:

```sh
pack write some-file.ext -iw multiple-level
pack write some-file.ext -iw single-level
```

#### Options:

- `-t, --type` Specifies the pack type (default: `"car"`).
- `-ps, --pack-size` Defines the maximum pack size in bytes (default: `MAX_PACK_SIZE`).
- `-iw, --index-writer` Specifies the indexing writer implementation, which can be `"single-level"` or `"multiple-level"` (default: `"multiple-level"`).

---

### `pack extract <targetCid> [filePath]`

Extracts Packs from the store and writes them to a file in the given path.

#### Examples:

```sh
pack extract bafk... some-file.car
```

#### Options:

- `-t, --type` Specifies the pack type (default: `"car"`).

---

### `pack clear`

Clear all packs stored.

#### Examples:

```sh
pack clear
```

---

### `index add <packCid> <filePath> [containingCid]`

Add Index record for the given verifiable pack (CAR file) using the specified strategy.

#### Examples:

```sh
index add bag... pack.car bafy... -iw multiple-level
index add bag... pack.car -iw single-level
```

#### Options:

- `-iw, --index-writer` Indexing writer implementation: "single-level" or "multiple-level" (default: `multiple-level`)

---

### `index find records <targetCid> [containingCid]`

Find index records of a given blob/pack/containing by its CID.

#### Examples:

```sh
index find records bafk...
index find records bafk... bafy...
```

### `index clear`

Clear all indexes within a writer.

#### Examples:

```sh
index clear -iw multiple-level
index clear -iw single-level
```

#### Options:

- `-iw, --index-writer` Indexing writer implementation: "single-level" or "multiple-level" (default: `multiple-level`)

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
