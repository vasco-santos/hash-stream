# `hash-stream`

The `hash-stream` command line interface.

## Getting started

Install the CLI from npm (**requires Node 20 or higher**):

```console
npm install -g @hash-stream/cli
```

## Usage

Basic usage with CAR files generated with [`ipfs-car`](https://github.com/storacha/ipfs-car) [documentation](./USAGE.md)

## Commands

- Index Management
  - [`index add`](#index-add-packcid-filepath-containingcid)
  - [`index find records`](#index-find-records-blockcid-containingcid)
  - [`index clear`](#index-clear)

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
