# 📦 Hash Stream Deployment Guide

## 📚 Table of Contents

- [📦 Hash Stream Deployment Guide](#-hash-stream-deployment-guide)
  - [Introduction](#introduction)
  - [🧱 Separation of Concerns: Reads vs. Writes](#-separation-of-concerns-reads-vs-writes)
  - [Setting Up a Hash Streamer](#setting-up-a-hash-streamer)
  - [🏗️ Read-Side Deployment Architectures](#️-read-side-deployment-architectures)
    - [1. 🧪 Minimal Local Server](#1-🧪-minimal-local-server)
    - [2. ☁️ Cloud-Native Serverless](#2-☁️-cloud-native-serverless)
    - [3. 🌐 Hybrid Edge + Cloud](#3-🌐-hybrid-edge--cloud)
    - [4. 🐳 Dockerized Long-Running Service](#4-🐳-dockerized-long-running-service)
  - [☁️ Deployment Setups](#️-deployment-setups)
    - [🌐 Cloudflare Workers Setup](#-cloudflare-workers-setup)
    - [AWS Setup](#aws-setup)
    - [Bare Metal / Local Disk](#bare-metal--local-disk)
  - [🔧 Storage Backends](#-storage-backends)
  - [📏 Caching Best Practices](#-caching-best-practices)
    - [What to Cache](#what-to-cache)
    - [Recommendations](#recommendations)
  - [🧩 Extending Hash Stream](#-extending-hash-stream)
  - [📦 Prebuilt Docker Images](#-prebuilt-docker-images)
  - [🧪 Use Verified Fetch as a client](#-use-verified-fetch-as-a-client)
    - [What is `verified-fetch`](#what-is-verified-fetch)
    - [Benefits](#benefits)
    - [How to Use](#how-to-use)
    - [Requirements](#requirements)
  - [🧳 Migrating Data from Legacy Sources](#-migrating-data-from-legacy-sources)
    - [1. I Already Have Content-Addressable Files](#1-i-already-have-content-addressable-files)
    - [2. I Have Raw Files or Data That Is Not Yet Content-Addressable](#2-i-have-raw-files-or-data-that-is-not-yet-content-addressable)
  - [🛠️ Testing Strategies](#️-testing-strategies)
    - [1. Unit & Integration Tests](#1-unit--integration-tests)
    - [2. Server Smoke Tests](#2-server-smoke-tests)
    - [3. Load and Performance Testing](#3-load-and-performance-testing)
  - [📉 Monitoring & Observability](#-monitoring--observability)
    - [Metrics to Track](#metrics-to-track)
    - [Logging](#logging)
    - [Instrumentation](#instrumentation)
    - [Alerts](#alerts)
    - [Deployment Suggestions](#deployment-suggestions)
  - [🔐 Security & Access Control](#-security--access-control)
    - [⚡ Threat Model Summary](#⚡-threat-model-summary)
    - [🔒 Securing Read APIs (Streamers)](#-securing-read-apis-streamers)
    - [🚫 Preventing Index/Pack Writes](#🚫-preventing-indexpack-writes)
    - [💰 API Keys or Signed URLs](#💰-api-keys-or-signed-urls)
    - [✨ Security Best Practices](#✨-security-best-practices)
    - [🤠 Optional: Content Whitelisting](#🤠-optional-content-whitelisting)
    - [📈 Audit & Compliance](#📈-audit--compliance)

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

## 📦 Prebuilt Docker Images

To simplify deployment, prebuilt Docker images of Hash Stream services may be used or created for various environments.

### Benefits

- 📦 Fast deployment and scaling
- 🔁 Consistent environments across dev/staging/prod
- 🔐 Easy to integrate with container-based infrastructure (e.g., ECS, Kubernetes, Nomad)

### Image Contents

A typical image includes:

- Node.js runtime
- Hash Stream CLI and/or streamer server code
- Optional configuration to mount or link volume/storage

### Example Dockerfile

```Dockerfile
# Use Node.js base image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of your code
COPY . .

# Expose the server port (adjust if needed)
EXPOSE 3000

# Start the app (adjust this to your actual start script if changed)
CMD ["node", "src/index.js"]
```

### Usage Example

```bash
docker build -t hash-stream .
docker run -p 3000:3000 \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  hash-stream
```

### Docker Compose Example

```yaml
version: '3.9'

services:
  hash-stream:
    build: .
    ports:
      - 3000:3000
    environment:
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      HS_S3_BUCKET: hash-stream-data
```

### Distribution

Optionally, publish official images to Docker Hub or GitHub Container Registry.

```
docker tag hash-stream ghcr.io/your-org/hash-stream
docker push ghcr.io/your-org/hash-stream
```

### Available Images

- https://hub.docker.com/r/vascosantos10/hash-stream-server

## 🧪 Use Verified Fetch as a client

Hash Stream supports trustless data retrieval using `verified-fetch`—a client library designed to verify content-addressable responses over HTTP.

This integration enables applications and services to verify data on the client side by using multihashes or the CAR format, increasing trust and interoperability with IPFS-like ecosystems.

### What is `verified-fetch`?

[`verified-fetch`](https://github.com/ipfs/helia-verified-fetch/tree/main/packages/verified-fetch) is a JavaScript library built for verifying multihash-based content responses over HTTP. It works seamlessly with servers exposing verifiable responses, such as those powered by Hash Stream.

### Benefits

- ✅ End-to-end trust: Client verifies data matches the expected hash
- ✅ Works with standard fetch API
- ✅ Integrates with `helia` and other IPFS tooling

### How to Use

You can integrate verified-fetch as follows:

```js
import { createVerifiedFetch } from 'verified-fetch'

// TODO: Set your server url after deployment
const serverUrl = ''

const verifiedFetch = await createVerifiedFetch({
  gateways: [serverUrl],
})

const res = await verifiedFetch(`ipfs://${cid}`)

const data = await res.blob()
// data is now verified

await verifiedFetch.stop()
```

### Requirements

- The HTTP server must stream blobs of data containing the expected CID
- Hash Stream streamer must support multihash validation (already built-in)
- Indexes in Hash Stream Index Store MUST be able to respond to block level indexes when relying on `verified-fetch` client. At the time of writing, its implementation traverses a DAG and requests block by block. One can rely on an Index writer like [`SingleLevelIndexWriter`](https://github.com/vasco-santos/hash-stream/tree/main/packages/index#writer).
- Client must know the expected multihash beforehand

## 🧳 Migrating Data from Legacy Sources

Hash Stream makes it easy to adopt trustless content-addressable data workflows without requiring you to rewrite your entire ingestion pipeline.

This section outlines two common migration paths for existing datasets:

### 1. I Already Have Content-Addressable Files

If your system already produces content-addressable files:

- ✅ You can use the [`IndexWriter`](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/README.md#writer) implementation, or the [`index add` command](https://github.com/vasco-santos/hash-stream/blob/main/packages/cli/README.md#index-add-packcid-filepath-containingcid) to generate the necessary index files for serving with Hash Stream.
- ✅ The data is ready to be served by a Hash Streamer with no changes required to the pack format.

Example:

```sh
hash-stream index add <packCID> <filePath>
```

You may also pass a `containingCID` if your CARs are part of larger containers.

See: [`index` package docs](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/README.md) for an example on how to use a `IndexWriter` programtically.

### 2. I Have Raw Files or Data That Is Not Yet Content-Addressable

If you are starting with raw blobs, files, or other formats:

- Use the [`PackWriter`](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/README.md#writing-packs) implementation or the [`pack write`](https://github.com/vasco-santos/hash-stream/blob/main/packages/cli/README.md#pack-write-filepath) command to transform data into verifiable packs. If the `PackWriter` implementation has access to an `IndexWriter` it can also create the indexes while transforming the data.

Example:

```sh
hash-stream pack write ./my-data.ext
```

See: [`pack` package docs](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/README.md) for an example on how to use a `PackWriter` programtically.

For advanced use cases (e.g., bulk processing, custom metadata tagging), build custom pipelines using the [pack](https://github.com/vasco-santos/hash-stream/blob/main/packages/pack/README.md) and [index](https://github.com/vasco-santos/hash-stream/blob/main/packages/index/README.md) libraries.

Alternatively, one can implement a new indexing strategy and `PackReader` that enables no data transformation at rest.

## 🛠️ Testing Strategies

To ensure robustness, performance, and compatibility of your Hash Stream deployment, a good testing strategy is essential.

### 1. Unit & Integration Tests

Hash Stream modules are modular and testable. You can write unit tests for:

- Pack/Index store implementations (`PackStore`, `IndexStore`)
- Reader and writer logic
- HTTP handlers and response formatting

Use your preferred test runner (e.g., Vitest, Jest, or Node’s built-in test runner) to validate:

```sh
npm test
```

There are testing suites exported for main interfaces of `Hash Stream`, in order to guarantee full compatibility with the remaining building blocks:

- `@hash-stream/index/test/reader`
- `@hash-stream/index/test/store`
- `@hash-stream/pack/test/pack`
- `@hash-stream/pack/test/reader`
- `@hash-stream/pack/test/writer`
- `@hash-stream/streamer/test/hash-streamer`

### 2. Server Smoke Tests

When running streamer instances:

- Perform basic content fetch using tools like `curl`, `wget`, or `verified-fetch`
- Confirm the response is correct and verifiable

Example:

```sh
curl http://localhost:3000/ipfs/<cid>
```

### 3. Load and Performance Testing

For high-throughput or production deployments:

- Use tools like `autocannon`, `wrk`, or `k6` to simulate traffic
- Test index and pack response latency under load
- Validate caching layer efficiency

Example:

```sh
npx autocannon -c 100 -d 30 http://localhost:3000/ipfs/<cid>
```

## 📉 Monitoring & Observability

Visibility into the health and performance of your Hash Stream deployment is crucial.

### Metrics to Track

- Number of requests served
- Latency per request
- Cache hits/misses (if applicable)
- Streaming failures (missing indexes/packs)

### Logging

Use structured logging (e.g., JSON) to enable easy parsing and ingestion by tools like:

- Datadog
- Loki + Grafana
- ELK stack

### Instrumentation

Use:

- Prometheus for metrics collection
- OpenTelemetry for traces
- Cloud-native tools (AWS CloudWatch, GCP Monitoring, etc.)

#### Example: Prometheus Server Instrumentation

```js
import { collectDefaultMetrics, Registry } from 'prom-client'

const register = new Registry()
collectDefaultMetrics({ register })

app.get('/metrics', async (c) => {
  return c.text(await register.metrics())
})
```

### Alerts

Set up alerts for:

- High latency
- Failed requests
- Missing data
- Drops in pack/index fetch success rate

### Deployment Suggestions

- Dockerize exporter containers alongside the streamer
- Use centralized dashboards for at-a-glance visibility

## 🔐 Security & Access Control

Hash Stream's modular nature allows it to be deployed in a wide variety of environments, from private networks to public-facing APIs. Regardless of the setting, it's important to consider how to restrict unauthorized access and ensure safe, verifiable content delivery.

This section outlines practical tips and strategies for securing deployments.

### ⚡ Threat Model Summary

The core security assumptions for Hash Stream deployments:

- Clients can verify data integrity by multihash (trustless model)
- Attacks are more likely to be about access (who can serve/read/write), not about data integrity
- Server-side authorization may be needed when data should not be served publicly

### 🔒 Securing Read APIs (Streamers)

By default, Hash Stream streamers are public read-only interfaces. To restrict access:

#### ✅ Apply Auth Middleware

You can apply any standard authentication middleware depending on the HTTP server used:

- Hono: use [hono-auth](https://hono.dev/middleware/builtin/bearer-auth) for bearer tokens
- Express.js: use `passport`, `express-jwt`, or custom middleware

Example (Hono):

```js
import { bearerAuth } from 'hono/auth'

app.use('/ipfs/*', bearerAuth({ token: process.env.READ_TOKEN }))
```

#### ⚖️ Network-Level Restrictions

- Restrict ports/IPs via firewall, NGINX, AWS security groups, Cloudflare Zero Trust, etc.
- Protect Cloudflare Workers with Access Rules

### 🚫 Preventing Index/Pack Writes

If deploying the CLI or ingestion pipelines:

- Use IAM permissions (e.g., AWS S3) to grant read-only access to streamers
- Run pack/index pipelines on isolated, secured infra (e.g., private ECS task)

Avoid placing pack-writing functionality on public endpoints unless strictly access-controlled.

### 💰 API Keys or Signed URLs

- Consider issuing signed URLs (e.g., CloudFront, S3 pre-signed) for time-limited access
- This can provide temporary, revocable links to specific content

### ✨ Security Best Practices

- ✅ Enable HTTPS for all endpoints
- ✅ Ensure environment variables and secrets (e.g., AWS keys) are never committed
- ✅ Use `.env` or secrets managers (e.g., AWS Secrets Manager, Doppler)
- ✅ Keep streamer servers up to date and behind a reverse proxy or CDN
- ✅ Use monitoring/alerting to detect suspicious access patterns (see Monitoring section)

### 🤠 Optional: Content Whitelisting

If you only want to serve known-safe CIDs:

- Maintain a whitelist of allowed multihashes in memory or DB
- Reject requests outside the list in your streamer handler

```js
const ALLOWED_HASHES = new Set(['zQm...', 'zQm...'])

if (!ALLOWED_HASHES.has(cid)) {
  return c.text('Forbidden', 403)
}
```

### 📈 Audit & Compliance

For enterprise environments:

- Enable request logging with hash lookups, timestamps, user/IP metadata
- Store access logs for later auditing
- Maintain changelogs or attestations of pack/index generation history
