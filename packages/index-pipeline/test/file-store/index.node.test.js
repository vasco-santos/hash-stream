import { runFileStoreTests } from './index.js'
import {
  getS3LikeFileStore,
  getFsStore,
  getCloudflareWorkerBucketStore,
} from './constructs.js'

describe('FileStore implementations', () => {
  // eslint-disable-next-line no-extra-semi
  ;[
    {
      name: 'FS',
      getFileStore: getFsStore,
    },
    {
      name: 'S3Like',
      getFileStore: getS3LikeFileStore,
    },
    {
      name: 'Cloudflare Worker Bucket',
      /**
       * @returns {Promise<import('./index.js').DestroyableAndUpdatableFileStore>}
       */
      getFileStore: getCloudflareWorkerBucketStore,
    },
  ].forEach(({ name, getFileStore }) => {
    runFileStoreTests(name, () => getFileStore())
  })
})
