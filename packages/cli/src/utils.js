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
