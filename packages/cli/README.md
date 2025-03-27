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

- Index Management
  - [`index add`](#index-add-packcid-filepath-containingcid)
  - [`index find records`](#index-find-records-blockcid-containingcid)
  - [`index clear`](#index-clear)
- **Pack Management**
  - [`pack write`](#pack-write-filepath)
  - [`pack clear`](#pack-clear)

---

### `pack write <filePath>`

Writes the given file blob into a set of verifiable packs, stores them, and optionally indexes them.

#### Examples:

```sh
pack write some-file.ext -s multiple-level
pack write some-file.ext -s single-level
```

#### Options:

- `-t, --type` Specifies the pack type (default: `"car"`).
- `-ps, --pack-size` Defines the maximum pack size in bytes (default: `MAX_PACK_SIZE`).
- `-is, --index-strategy` Defines the indexing strategy, which can be `"single-level"` or `"multiple-level"` (default: `"multiple-level"`).

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
index add bag... pack.car bafy... -s multiple-level
index add bag... pack.car -s single-level
```

#### Options:

- `-s, --strategy` Indexing strategy: "single-level" or "multiple-level" (default: `multiple-level`)

---

### `index find records <targetCid> [containingCid]`

Find index records of a given blob/pack/containing by its CID, using a specified strategy.

#### Examples:

```sh
index find records bafk... -s single-level
index find records bafy... -s multiple-level
index find records bafk... bafy... -s multiple-level
```

#### Options:

- `-s, --strategy` Indexing strategy: "single-level" or "multiple-level" (default: `single-level`)

---

### `index clear`

Clear all indexes within a strategy.

#### Examples:

```sh
index clear -s multiple-level
index clear -s single-level
```

#### Options:

- `-s, --strategy` Indexing strategy: "single-level" or "multiple-level" (default: `multiple-level`)

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
