#!/usr/bin/env node

import sade from 'sade'
import fs from 'fs'

import {
  indexCreate,
  indexFindBlock,
  indexFindContainers,
  indexClear,
} from './index.js'

const pkg = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url)).toString()
)
const cli = sade(pkg.name)

cli.version(pkg.version)

// Command: Create an Index
cli
  .command('index create <containerCid> <filePath> [contextCid]')
  .describe(
    'Create an index for the given verifiable container (CAR file) using the specified strategy.'
  )
  .example('index create bag... container.car bafy... -s multiple-level')
  .example('index create bag... container.car -s block-level')
  .option(
    '-s, --strategy',
    'Indexing strategy: "block-level" or "multiple-level"',
    'multiple-level'
  )
  .action(indexCreate)

// Command: Find a Block's Location
cli
  .command('index find block <blockCid> [contextCid]')
  .describe(
    'Find the location of a given block by its CID, using a specified strategy.'
  )
  .example('index find block bafk... -s block-level')
  .example('index find block bafk... bafy... -s multiple-level')
  .option(
    '-s, --strategy',
    'Indexing strategy: "block-level" or "multiple-level"',
    'block-level'
  )
  .action(indexFindBlock)

// Command: Find Containers Holding a Content Multihash
cli
  .command('index find containers <contentCid>')
  .describe(
    'Find all containers that hold the given content CID, using "multiple-level" strategy.'
  )
  .example('index find containers bafy... -s multiple-level')
  .action(indexFindContainers)

// Command: Clear Index
cli
  .command('index clear')
  .describe('Clear all indexes within a stratehy.')
  .example('index clear -s multiple-level')
  .example('index clear -s block-level')
  .option(
    '-s, --strategy',
    'Indexing strategy: "block-level" or "multiple-level"',
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
