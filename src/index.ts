#!/usr/bin/env node

import {Builtins, Cli} from 'clipanion'
import {version} from './helpers/version'
import { UploadCommand } from './commands/sourcemaps/upload'

const onError = (err: any) => {
  console.log(err)
  process.exitCode = 1
}

process.on('uncaughtException', onError)
process.on('unhandledRejection', onError)

const cli = new Cli({
  binaryLabel: 'KF CLI',
  binaryName: 'kf-cli',
  binaryVersion: version,
})

cli.register(Builtins.HelpCommand)
cli.register(Builtins.VersionCommand)
cli.register(UploadCommand)

if (require.main === module) {
  void cli.runExit(process.argv.slice(2), {
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  })
}

export {cli}
