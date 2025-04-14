# 📦 Hash Stream Deployment Guide

## Introduction

Hash Stream provides modular building blocks for running an off-the-shelf, trustless HTTP server for content-addressable data. While primarily designed to enable content providers to scalably and verifiably serve data over HTTP, Hash Stream also includes optional components for ingesting data and generating indexes to facilitate retrieval.

All components are modular with well-defined interfaces, allowing adopters to plug in their own infrastructure or use only the parts they need.

This guide outlines best practices for deploying Hash Stream in **read-focused** production environments—such as streamers or trustless IPFS gateways. It includes recommended deployment architectures, cloud/local options, and scaling considerations.

## 🧱 Separation of Concerns: Reads vs. Writes

Hash Stream cleanly separates content ingestion and transformation (**writes**) from verifiable content serving (**reads**).

- **Reads**: Use the `@hash-streamer/streamer` library to serve verified content from indexes and pack stores.
- **Writes**: Use the CLI or custom tools built with Hash Stream’s index/pack packages to:
  - Transform raw data into CAR files (packs)
  - Generate index records for retrieval

💡 One can ingest on one machine and serve from another. Writes and reads are fully decoupled, so that one can ingest content with a CLI on one machine and serve it from a cloud-based HTTP gateway elsewhere. Many adopters may opt to use only one side of the system.

## Setting Up a Hash Streamer

The building blocks to create a Hash Stream to serve content are:

- `IndexReader` - enables reading indexes associated with a given `multihash`
- `PackReader` - enables reading data associated with a given `multihash` from its location
- `HashStreamer` - enables streamming verifiable data read

For each building blocks there MAY be several implementations, which MUST be compatible by following the same interfaces.

Here follows an example implementation of `HashStreamer`, relying on the Host File System:

```js
// Streamer
import { HashStreamer } from '@hash-stream/streamer'

// Index
import { IndexReader } from '@hash-stream/index/reader'
import { FSIndexStore } from '@hash-stream/index/store/fs'

// Pack
import { PackReader } from '@hash-stream/pack/reader'
import { FSPackStore } from '@hash-stream/pack/store/fs'

export function getHashStreamer() {
  const hashStreamPath = `~/hash-streamer-server`
  const indexStore = new FSIndexStore(`${hashStreamPath}/index`)
  const packStore = new FSPackStore(`${hashStreamPath}/pack`)

  const indexReader = new IndexReader(indexStore)
  const packReader = new PackReader(packStore)

  return new HashStreamer(indexReader, packReader)
}
```

Next follows an example implementation of `HashStreamer`, relying on a S3-like Cloud object storage compatible with S3 client:

```js
// S3 client
import { S3Client } from '@aws-sdk/client-s3'

// Streamer
import { HashStreamer } from '@hash-stream/streamer'

// Index
import { IndexReader } from '@hash-stream/index/reader'
import { S3LikeIndexStore } from '@hash-stream/index/store/s3-like'

// Pack
import { PackReader } from '@hash-stream/pack/reader'
import { S3LikePackStore } from '@hash-stream/pack/store/s3-like'

export function getHashStreamer() {
  const client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })

  const packStore = new S3LikePackStore({
    bucketName: 'pack-store', // name of bucket created
    client,
  })
  const indexStore = new S3LikeIndexStore({
    bucketName: 'index-store', // name of bucket created
    client,
  })

  const indexReader = new IndexReader(indexStore)
  const packReader = new PackReader(packStore)

  return new HashStreamer(indexReader, packReader)
}
```

## 🏗️ Read-Side Deployment Architectures

### 1. 🧪 Minimal Local Server

- Run `@hash-streamer/streamer` as an HTTP server on a local machine.
- Store packs and indexes on local disk.
- Great for:
  - Testing ingestion/indexing strategies
  - Air-gapped environments

### 2. ☁️ Cloud-Native Serverless

- Deploy `@hash-streamer/streamer` on AWS Lambda or Cloudflare Workers.
- Use S3/R2 to store packs and indexes.
- Scales horizontally with traffic.

### 3. 🌐 Hybrid Edge + Cloud

- Serve requests from Cloudflare Workers/CDN edge compute.
- Forward to backend (Node.js or containerized HTTP service) that streams from S3 or other storage.
- Minimizes latency + centralizes compute.

### 4. 🐳 Dockerized Long-Running Service

- Package streamer as a Docker service or standalone Node.js app.
- Backed by:
  - Local volume mount
  - Network-mounted disk
  - Remote object storage (S3/R2)

## ☁️ Deployment Setups

### 🌐 Cloudflare Workers Setup

Use Cloudflare Workers to serve data directly from R2.

✅ Suggested stack:

- Workers for request handling and serving data
- R2 (Cloudflare’s S3-compatible object storage) for packs and indexes
- KV or Workers Cache API for low-latency response caching (optional)

📘 [PoC Example](https://github.com/vasco-santos/hash-stream-infra-poc-cf) using [SST](https://sst.dev/) to setup the infrastructure and facilitate deployment process.

#### Deployment walkthrough

- Create R2 bucket (packs + indexes)
- Configure bindings in Worker script
- Route `GET /ipfs/:cid` requests through the streamer to resolve and stream the pack.
- (Optional) Enable Cloudflare Cache API for indexes

### AWS Setup

Run Hash Stream in AWS with minimal infra.

✅ Suggested stack:

- AWS Lambda (or ECS for long-running service)
- S3 for packs and index files
- (May use CloudFront for CDN + Caching)

#### Deployment walkthrough

- Use CDK or Terraform to:
  - Deploy Lambda function
  - Grant S3 read permissions
  - Setup CloudFront distribution
  - (Optional) Add custom domain via Route53
- Use services like SST as described in "Cloudflare Workers Setup" setup example

### Bare Metal / Local Disk

Run Hash Stream on local machine or internal server.

✅ Suggested stack:

- Long-running Node.js server (or similar) using `@hash-streamer/streamer`, or within a Docker container.
- Local disk, mounted network volume or S3 client-compatible object storage for pack/index storage

A simple server using [`hono`](https://hono.dev/) can be created as follows relying on the `HashStreamer` created in the code snippet above:

```js
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { http } from '@hash-stream/utils/trustless-ipfs-gateway'

import { getHashStreamer } from './lib.js'

const app = new Hono()

app.get('/ipfs/:cid', async (c) => {
  const hashStreamer = getHashStreamer()
  return http.httpipfsGet(c.req.raw, { hashStreamer })
})

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`) // Listening on http://localhost:3000
})
```

Ideal for:

- Internal networks or LAN setups
- Testing new ingestion/indexing strategies
- Low load setups

📘 [PoC Server](https://github.com/vasco-santos/hash-stream-infra-poc-server)

Naturally, this setup can rely on a remote storage like S3 as well. For that, only the store implementation(s) need to be updated.

## 🔧 Storage Backends

Hash Stream’s pack and index stores implement a pluggable interface. You can easily swap between backends:

✅ Currently supported:

- Local filesystem (FS-based)
- S3-compatible object storage (e.g. AWS S3, Cloudflare R2, MinIO)
- Custom in-memory/test stores
- Custom implementations using the `PackStore` and `IndexStore` interfaces

## 📏 Caching Best Practices

Because all data is immutable and content-addressed, it’s highly cache-friendly.

### What to Cache

- **Index files** (tiny, often accessed): Cache in memory or CDN
- **Pack files (CARs)**: Cache on disk, object storage, or CDN
- **Response headers**: Use `Cache-Control: immutable, max-age=...` for full effect

### Recommendations

- ✅ Memory cache for hot indexes (in Node.js or Workers)
- ✅ CDN (Cloudflare / CloudFront) for pack files
- ✅ Use strong ETags or immutable URLs (since hashes don’t change)

## 🧩 Extending Hash Stream

You can customize Hash Stream for your infra:

- Implement your own `PackStore` or `IndexStore`
- Create a custom HTTP handler wrapping the streamer logic
- Follow interface contracts to stay interoperable with the ecosystem

## Client

For consuming content:

- [verified-fetch](https://github.com/ipfs/helia-verified-fetch/tree/main/packages/verified-fetch): A fetch-compatible client for trustlessly loading CIDs over HTTP.
