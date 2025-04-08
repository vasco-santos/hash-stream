import path from 'path'
import fs from 'fs'

/**
 * @param {string} filePath
 */
export async function getFileStream(filePath) {
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath)

  try {
    await fs.promises.access(resolvedPath, fs.constants.F_OK)
  } catch (err) {
    console.error(`File does not exist at path: ${resolvedPath}`)
    process.exit(1)
  }

  const stats = await fs.promises.stat(resolvedPath)
  if (!stats.isFile()) {
    console.error(`Path is not a file: ${resolvedPath}`)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(resolvedPath)

  fileStream.on('error', (err) => {
    console.error('Error reading file:', err)
    process.exit(1)
  })

  return fileStream
}

/**
 * Resolves the store backend to use, checking CLI options and environment variables.
 * Priority: CLI flag > ENV var > default ('fs')
 *
 * @param {'fs' | 's3'} [storeBackend]
 * @returns {'fs' | 's3'}
 */
export function resolveStoreBackend(storeBackend) {
  if (storeBackend) {
    if (storeBackend !== 'fs' && storeBackend !== 's3') {
      console.error(
        `Invalid store backend: ${storeBackend}. Must be 'fs' or 's3'.`
      )
      process.exit(1)
    }
    return storeBackend
  }

  if (process.env.HASH_STREAM_STORE_BACKEND) {
    if (
      process.env.HASH_STREAM_STORE_BACKEND !== 'fs' &&
      process.env.HASH_STREAM_STORE_BACKEND !== 's3'
    ) {
      console.error(
        `Invalid store backend from env: ${process.env.HASH_STREAM_STORE_BACKEND}. Must be 'fs' or 's3'.`
      )
      process.exit(1)
    }

    return process.env.HASH_STREAM_STORE_BACKEND
  }

  // Default to 'fs' if no other options are provided
  return 'fs'
}

/**
 * Extracts S3 configuration from environment variables.
 * You can customize/validate this further if needed.
 */
export function getS3ConfigFromEnv() {
  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN,
    AWS_REGION,
    AWS_ENDPOINT,
    HASH_STREAM_S3_INDEX_BUCKET,
    HASH_STREAM_S3_PACK_BUCKET,
    HASH_STREAM_S3_INDEX_PREFIX,
    HASH_STREAM_S3_PACK_PREFIX,
  } = process.env

  if (
    !AWS_ACCESS_KEY_ID ||
    !AWS_SECRET_ACCESS_KEY ||
    !HASH_STREAM_S3_INDEX_BUCKET ||
    !HASH_STREAM_S3_PACK_BUCKET
  ) {
    throw new Error(
      'Missing required environment variables for S3 store. Make sure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, HASH_STREAM_S3_INDEX_BUCKET and HASH_STREAM_S3_PACK_BUCKET are set.'
    )
  }

  return {
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      sessionToken: AWS_SESSION_TOKEN,
    },
    endpoint: AWS_ENDPOINT,
    region: AWS_REGION || 'us-east-1',
    indexBucket: HASH_STREAM_S3_INDEX_BUCKET,
    packBucket: HASH_STREAM_S3_PACK_BUCKET,
    indexPrefix: HASH_STREAM_S3_INDEX_PREFIX || '',
    packPrefix: HASH_STREAM_S3_PACK_PREFIX || '',
  }
}
