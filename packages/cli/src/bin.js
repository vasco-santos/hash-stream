#!/usr/bin/env node

import sade from 'sade'
import fs from 'fs'
import updateNotifier from 'update-notifier'

import { indexAdd, indexFindRecords, indexClear } from './index.js'
import { packWrite, packExtract, packClear, MAX_PACK_SIZE } from './pack.js'
import { streamerDump } from './streamer.js'

const pkg = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url)).toString()
)

updateNotifier({ pkg }).notify({ isGlobal: true })

const cli = sade(pkg.name)

cli.version(pkg.version)

const commonOptions = (/** @type {sade.Sade} */ cliCommand) =>
  cliCommand.option(
    '-v, --verbose',
    'Print extra output about internal operations for debugging and transparency',
    false
  )

// Streamer commands
// Command: Streamer dump
commonOptions(
  cli
    .command('streamer dump <targetCid> <filePath> [containingCid]')
    .describe(
      `Dump the blob data associated with the given target CID from stored Packs based on the known index records.  
    The data is extracted and written to the specified file path in the selected Pack format.`
    )
    .example('streamer dump bafy... /usr/dumps/baf...car')
    .option('-f, --format', 'Pack format: "car" or "raw"', 'car')
    .option(
      '-sb, --store-backend',
      'Which storage backend to use: "fs" (default) or "s3" for S3-like storage'
    )
    .action(streamerDump)
)

// Pack commands
// Command: Write Packs
commonOptions(
  cli
    .command('pack write <filePath>')
    .describe(
      'Writes given file blob into a set of verifiable packs, stores them and optionally indexes them.'
    )
    .example('pack write some-file.ext -iw multiple-level')
    .example('pack write some-file.ext -iw single-level')
    .example('pack write some-file.ext -iw all')
    .option('-f, --format', 'Pack format: "car"', 'car')
    .option('-ps, --pack-size', 'Pack size in bytes', MAX_PACK_SIZE)
    .option(
      '-iw, --index-writer',
      'Indexing writer implementation: "single-level" or "multiple-level" or "all"',
      'multiple-level'
    )
    .option(
      '-sb, --store-backend',
      'Which storage backend to use: "fs" (default) or "s3" for S3-like storage'
    )
    .action(packWrite)
)

// Command: Extract Packs
commonOptions(
  cli
    .command('pack extract <targetCid> [filePath]')
    .describe(
      'Extracts Packs from the store and writes them to a file in the given path.'
    )
    .example('pack extract bag... some-file.car')
    .option('-f, --format', 'Pack format: "car"', 'car')
    .option(
      '-sb, --store-backend',
      'Which storage backend to use: "fs" (default) or "s3" for S3-like storage'
    )
    .action(packExtract)
)

// Command: Clear packs
commonOptions(
  cli
    .command('pack clear')
    .describe('Clear all packs stored.')
    .example('pack clear')
    .option(
      '-sb, --store-backend',
      'Which storage backend to use: "fs" (default) or "s3" for S3-like storage'
    )
    .action(packClear)
)

// Index commands

// Command: Add Records to the Index
commonOptions(
  cli
    .command('index add <packCid> <packPath> [containingCid]')
    .describe('Adds an index for a given pack using the specified writer.')
    .example('index add bag... pack.car bafy... -iw multiple-level')
    .example('index add bag... pack.car bafy... -iw all')
    .example('index add bag... pack.car -iw single-level')
    .option(
      '-iw, --index-writer',
      'Indexing writer implementation: "single-level" or "multiple-level" or "all"',
      'multiple-level'
    )
    .option(
      '-sb, --store-backend',
      'Which storage backend to use: "fs" (default) or "s3" for S3-like storage'
    )
    .option('-f, --format', 'Pack format: "car"', 'car')
    .action(indexAdd)
)

// Command: Find index records for a given target
commonOptions(
  cli
    .command('index find records <targetCid> [containingCid]')
    .describe('Find index records of a given blob/pack/containing by its CID.')
    .example('index find records bafk...')
    .example('index find records bafk... bafy...')
    .option(
      '-sb, --store-backend',
      'Which storage backend to use: "fs" (default) or "s3" for S3-like storage'
    )
    .action(indexFindRecords)
)

// Command: Clear Index
commonOptions(
  cli
    .command('index clear')
    .describe('Clear all index records stored.')
    .example('index clear')
    .option(
      '-sb, --store-backend',
      'Which storage backend to use: "fs" (default) or "s3" for S3-like storage'
    )
    .action(indexClear)
)

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
