#!/usr/bin/env node

import sade from 'sade'
import fs from 'fs'

import { indexAdd, indexFindRecords, indexClear } from './index.js'
import { packWrite, packClear, MAX_PACK_SIZE } from './pack.js'

const pkg = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url)).toString()
)
const cli = sade(pkg.name)

cli.version(pkg.version)

// Pack commands
// Command: Write Packs
cli
  .command('pack write <filePath>')
  .describe(
    'Writes given file blob into a set of verifiable packs, stores them and optionally indexes them.'
  )
  .example('pack write some-file.ext -s multiple-level')
  .example('pack write some-file.ext -s single-level')
  .option('-t, --type', 'Pack type: "car"', 'car')
  .option('-ps, --pack-size', 'Pack size in bytes', MAX_PACK_SIZE)
  .option(
    '-is, --index-strategy',
    'Indexing strategy: "single-level" or "multiple-level"',
    'multiple-level'
  )
  .action(packWrite)

// Command: Clear packs
cli
  .command('pack clear')
  .describe('Clear all packs stored.')
  .example('pack clear')
  .action(packClear)

// Index commands

// Command: Add Records to the Index
cli
  .command('index add <packCid> <filePath> [containingCid]')
  .describe(
    'Adds an index for a given verifiable pack (CAR file) using the specified strategy.'
  )
  .example('index add bag... pack.car bafy... -s multiple-level')
  .example('index add bag... pack.car -s single-level')
  .option(
    '-s, --strategy',
    'Indexing strategy: "single-level" or "multiple-level"',
    'multiple-level'
  )
  .action(indexAdd)

// Command: Find index records for a given target
cli
  .command('index find records <targetCid> [containingCid]')
  .describe(
    'Find index records of a given blob/pack/containing by its CID, using a specified strategy.'
  )
  .example('index find records bafk... -s single-level')
  .example('index find records bafk... bafy... -s multiple-level')
  .option(
    '-s, --strategy',
    'Indexing strategy: "single-level" or "multiple-level"',
    'multiple-level'
  )
  .action(indexFindRecords)

// Command: Clear Index
cli
  .command('index clear')
  .describe('Clear all indexes within a strategy.')
  .example('index clear -s multiple-level')
  .example('index clear -s single-level')
  .option(
    '-s, --strategy',
    'Indexing strategy: "single-level" or "multiple-level"',
    'multiple-level'
  )
  .action(indexClear)

// show help text if no command provided
cli.command('help [cmd]', 'Show help text', { default: true }).action((cmd) => {
  try {
    cli.help(cmd)
  } catch (err) {
    console.log(`
ERROR
  Invalid command: ${cmd}
  
Run \`$ w3 --help\` for more info.
`)
    process.exit(1)
  }
})

cli.parse(process.argv)

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason)
})
