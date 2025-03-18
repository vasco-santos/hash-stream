/**
 * @param {object} [options]
 * @param {string} [options.storeName]
 */
export function createEnv(options = {}) {
  const { storeName } = options
  const env = { HASH_STREAM_STORE_NAME: storeName ?? 'hash-stream-test' }
  return env
}
