import assert from 'assert'

// File Store
import { CloudflareWorkerBucketFileStore } from '../../src/file-store/cf-worker-bucket.js'

describe('Cloudflare Worker bucket store implementation specifics', () => {
  it('handles paginated results when listing files', async () => {
    const store = createPaginatedMockStore()

    const files = []
    for await (const file of store.list()) {
      files.push(file)
    }

    assert.strictEqual(files.length, 2)
    assert.strictEqual(files[0].key, 'file1.txt')
    assert.strictEqual(files[0].size, 123)
    assert.strictEqual(files[1].key, 'file2.txt')
    assert.strictEqual(files[1].size, 456)
  })

  it('returns null when object is not found in R2', async () => {
    const fakeBucket = {
      // @ts-ignore Mock bucket
      get: async (key) => null,
    }

    const store = new CloudflareWorkerBucketFileStore({
      // @ts-ignore Mock bucket
      bucket: fakeBucket,
      prefix: 'foo/',
    })

    const result = await store.get('non-existent.txt')
    assert.strictEqual(result, null)
  })
})

function createPaginatedMockStore() {
  const calls = []

  /** @type {import('@cloudflare/workers-types').R2Bucket} */
  const bucket = {
    get: async (key) => null,
    // @ts-expect-error - Mock implementation
    list: async ({ cursor }) => {
      calls.push(cursor)
      if (!cursor) {
        return {
          objects: [{ key: 'file1.txt', size: 123 }],
          truncated: true,
          cursor: 'next-cursor',
        }
      } else {
        return {
          objects: [{ key: 'file2.txt', size: 456 }],
          truncated: false,
        }
      }
    },
  }

  return new CloudflareWorkerBucketFileStore({ bucket })
}
