# Pack Writer Specification

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Vasco Santos](https://github.com/vasco-santos)

## Authors

- [Vasco Santos](https://github.com/vasco-santos)

# Abstract

This document describes the Pack Writer, responsible for interacting with a Pack Store to store packs.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Overview

Hash-stream relies on Packs for both storing Content-Addressable data and transferring it across the network in a verifiable manner. A Pack is a container that holds a collection of byte streams. This specification defines the **Writer** interfaces, which enable interaction with other Hash-stream building blocks.

A **Pack** contains multiple **Blobs**, each addressed by a unique multihash. A **Pack** itself is also addressable via a multihash, meaning it can be treated as a **Blob**. Multiple **Packs** MAY also store the same **Blob**. A **Blob** is a sequence of bytes that can be stored individually or within a **Pack**.

## Design Principles

- **Efficient storage access**: Optimized for cost-effective and rapid data retrieval.
- **Pluggable storage backends**: Supports different storage layers (e.g., filesystem, cloud storage).

## Interfaces

### Pack Writer Interface

```ts
import { MultihashDigest, MultihashHasher } from 'multiformats'

export interface PackWriter {
  storeWriter: PackStoreWriter

  // Index writer interface, as defined in the Index Writer Specification
  // If not set, the Pack contents are not indexed upon writing.
  indexWriter?: IndexWriter

  write(
    blobLike: BlobLike,
    options: PackWriterWriteOptions
  ): Promise<{
    containingMultihash: MultihashDigest
    packsMultihashes: MultihashDigest[]
  }>
}

export interface PackStoreWriter {
  /**
   * Stores a pack file.
   *
   * @param hash - The Multihash digest of the pack.
   * @param data - The pack file bytes.
   * @returns A promise that resolves when the pack file is stored.
   */
  put(hash: MultihashDigest, data: Uint8Array): Promise<void>
}

export interface BlobLike {
  /**
   * Returns a ReadableStream which yields the Blob data.
   */
  stream: Blob['stream']
}

export interface PackWriterWriteOptions {
  /**
   * The type of pack format used.
   */
  type: 'car'
  /**
   * If true, skips indexing the containing multihash for the written blob.
   */
  notIndexContaining?: boolean
  /**
   * Custom hasher to be used for hashing the blobs.
   **/
  hasher?: MultihashHasher
}
```

## Storage Implementation Strategies

### Filesystem-based Store

- Blocks and containers stored as files.
- Uses indexing for quick lookups.

### Cloud Storage Backend

- Uses object storage (e.g., S3, GCS).
- Indexes maintained separately for efficient access.

## Future work

- implementation suggestions for storage, like which keys are good idea to use, etc
