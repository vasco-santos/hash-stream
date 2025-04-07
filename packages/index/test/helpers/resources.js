import pRetry from 'p-retry'
import { customAlphabet } from 'nanoid'
import { GenericContainer as Container } from 'testcontainers'
import { Miniflare } from 'miniflare'
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'

/**
 * @param {object} [opts]
 * @param {number} [opts.port]
 * @param {string} [opts.region]
 */
export async function createS3Like(opts = {}) {
  const region = opts.region || 'us-west-2'
  const port = opts.port || 9000

  const minio = await pRetry(() =>
    new Container('quay.io/minio/minio')
      .withCommand(['server', '/data'])
      .withExposedPorts(port)
      .start()
  )

  const clientOpts = {
    endpoint: `http://${minio.getHost()}:${minio.getMappedPort(port)}`,
    forcePathStyle: true,
    region,
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    },
  }

  return {
    client: new S3Client(clientOpts),
    clientOpts,
  }
}

/**
 * @param {S3Client} s3
 */
export async function createBucket(s3) {
  const id = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)
  const Bucket = id()
  await s3.send(new CreateBucketCommand({ Bucket }))
  return Bucket
}

/**
 * Create a mock R2Bucket
 *
 * @returns {Promise<{ bucket: import('@cloudflare/workers-types').R2Bucket, mf: Miniflare }>}
 */
export async function createCloudflareWorkerBucket() {
  // Initialize a new R2 bucket instance with Miniflare's mock environment
  const mf = new Miniflare({
    // Pass any configuration you'd like, or leave it empty
    script: `
      export default {
        fetch(req) {
          return new Response("Hello World")
        }
      }
    `,
    r2Buckets: {
      BUCKET: '',
    },
    modules: true,
  })

  await mf.ready // Ensure Miniflare is ready
  const bucket = await mf.getR2Bucket('BUCKET') // Gets mock R2Bucket

  // @ts-expect-error different types between miniflare and worker types
  return { mf, bucket }
}
