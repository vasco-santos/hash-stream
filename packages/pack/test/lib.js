import { runPackReaderTests } from './reader.js'
import { runPackWriterTests } from './writer.js'

export const test = {
  reader: runPackReaderTests,
  writer: runPackWriterTests,
}
