import { runIndexReaderTests } from './reader.js'
import { runIndexStoreTests } from './store.js'

export const test = {
  reader: runIndexReaderTests,
  store: runIndexStoreTests,
}
