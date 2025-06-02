/**
 * Reads all chunks from a ReadableStream and returns them as an array.
 *
 * @template T
 * @param {ReadableStream<T>} stream
 * @returns {Promise<T[]>}
 */
export async function readAll(stream) {
  const reader = stream.getReader()
  const chunks = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return chunks
}

/**
 * Reads all chunks from a ReadableStream and returns the last.
 *
 * @template T
 * @param {ReadableStream<T>} stream
 * @returns {Promise<T | undefined>}
 */
export async function readLast(stream) {
  const reader = stream.getReader()
  let chunk
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunk = value
  }
  return chunk
}
