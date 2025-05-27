import assert from 'assert'

// File Store
import { S3LikeFileStore } from '../../src/file-store/s3-like.js'

describe('S3 like store implementation specifics', () => {
  it('paginates when listing S3 objects', async () => {
    const store = createPaginatedS3Store()
    const files = []
    for await (const file of store.list()) {
      files.push(file)
    }

    assert.deepStrictEqual(files, [
      { key: 'page1.txt', size: 100 },
      { key: 'page2.txt', size: 200 },
    ])
  })

  it('returns null if get() returns no Body', async () => {
    const client = {
      send: async () => ({ Body: undefined }),
    }

    // @ts-ignore Mock S3 client
    const store = new S3LikeFileStore({ bucketName: 'test-bucket', client })
    const result = await store.get('somefile.txt')
    assert.strictEqual(result, null)
  })

  it('returns null if get() throws NoSuchKey error', async () => {
    const client = {
      send: async () => {
        const err = new Error('Not found')
        err.name = 'NoSuchKey'
        throw err
      },
    }

    // @ts-ignore Mock S3 client
    const store = new S3LikeFileStore({ bucketName: 'test-bucket', client })
    const result = await store.get('missing.txt')
    assert.strictEqual(result, null)
  })

  it('skips S3 list objects with missing Key', async () => {
    const client = {
      send: async () => ({
        Contents: [
          { Size: 100 }, // no Key
          { Key: 'valid.txt', Size: 200 },
        ],
        IsTruncated: false,
      }),
    }

    // @ts-ignore Mock S3 client
    const store = new S3LikeFileStore({ bucketName: 'test-bucket', client })
    const files = []
    for await (const file of store.list()) {
      files.push(file)
    }

    assert.deepStrictEqual(files, [{ key: 'valid.txt', size: 200 }])
  })
})

function createPaginatedS3Store() {
  const client = {
    send: async (
      /** @type {{ input: { ContinuationToken: any; }; }} */ command
    ) => {
      if (!command.input.ContinuationToken) {
        return {
          Contents: [{ Key: 'page1.txt', Size: 100 }],
          IsTruncated: true,
          NextContinuationToken: 'page2',
        }
      } else {
        return {
          Contents: [{ Key: 'page2.txt', Size: 200 }],
          IsTruncated: false,
        }
      }
    },
  }

  // @ts-ignore Mock S3 client
  return new S3LikeFileStore({ bucketName: 'test-bucket', client })
}
