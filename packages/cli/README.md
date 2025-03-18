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

## Commands

- Index Management
  - [`index create`](#index-create-containercid-filepath-contextcid)
  - [`index find block`](#index-find-block-blockcid-contextcid)
  - [`index find containers`](#index-find-containers-contentcid)
  - [`index clear`](#index-clear)

---

### `index create <containerCid> <filePath> [contextCid]`

Create an index for the given verifiable container (CAR file) using the specified strategy.

#### Examples:

```sh
index create bag... container.car bafy... -s multiple-level
index create bag... container.car -s block-level
```

#### Options:

- `-s, --strategy` Indexing strategy: "block-level" or "multiple-level" (default: `multiple-level`)

---

### `index find block <blockCid> [contextCid]`

Find the location of a given block by its CID, using a specified strategy.

#### Examples:

```sh
index find block bafk... -s block-level
index find block bafk... bafy... -s multiple-level
```

#### Options:

- `-s, --strategy` Indexing strategy: "block-level" or "multiple-level" (default: `block-level`)

---

### `index find containers <contentCid>`

Find all containers that hold the given content CID, using the "multiple-level" strategy.

#### Examples:

```sh
index find containers bafy... -s multiple-level
```

---

### `index clear`

Clear all indexes within a strategy.

#### Examples:

```sh
index clear -s multiple-level
index clear -s block-level
```

#### Options:

- `-s, --strategy` Indexing strategy: "block-level" or "multiple-level" (default: `multiple-level`)

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
