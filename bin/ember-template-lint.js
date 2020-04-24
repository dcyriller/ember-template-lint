#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const getStdin = require('get-stdin');
const globby = require('globby');
const Linter = require('../lib/index');
const processResults = require('../lib/helpers/process-results');

const STDIN = '/dev/stdin';

async function getSource(filePath) {
  if (isReadingFromStdin(filePath)) {
    let stdin = await getStdin();
    return stdin;
  }

  return fs.readFileSync(filePath, { encoding: 'utf8' });
}

function isReadingFromStdin(filePath) {
  return filePath === STDIN;
}

async function buildLinterOptions(relativeFilePath, cliOptions) {
  let absoluteFilePath = path.resolve(relativeFilePath);

  let filePath = relativeFilePath;
  if (isReadingFromStdin(absoluteFilePath)) {
    filePath = cliOptions.filename || '';
  }

  let moduleId = filePath.slice(0, -4);

  let source = await getSource(absoluteFilePath);

  return { source, filePath, moduleId };
}

async function lintFile(linter, relativeFilePath, cliOptions) {
  let options = await buildLinterOptions(relativeFilePath, cliOptions);

  if (cliOptions.fix) {
    let { isFixed, output, messages } = linter.verifyAndFix(options);
    if (isFixed) {
      fs.writeFileSync(options.filePath, output);
    }

    return messages;
  } else {
    return linter.verify(options);
  }
}

function expandFileGlobs(filePatterns, ignorePattern) {
  let result = new Set();

  filePatterns.forEach((pattern) => {
    globby
      // `--no-ignore-pattern` results in `ignorePattern === [false]`
      .sync(pattern, ignorePattern[0] === false ? {} : { ignore: ignorePattern, gitignore: true })
      .filter((filePath) => filePath.slice(-4) === '.hbs')
      .forEach((filePath) => result.add(filePath));
  });

  return result;
}

function getFilesToLint(filePatterns, ignorePattern = []) {
  let files;

  if (filePatterns.length === 0 || filePatterns.includes('-') || filePatterns.includes(STDIN)) {
    files = new Set([STDIN]);
  } else {
    files = expandFileGlobs(filePatterns, ignorePattern);
  }

  return files;
}

function parseArgv(_argv) {
  let parser = require('yargs')
    .scriptName('ember-template-lint')
    .usage('$0 [options] [files..]')
    .options({
      'config-path': {
        describe: 'Define a custom config path',
        default: '.template-lintrc.js',
        type: 'string',
      },
      config: {
        describe:
          'Define a custom configuration to be used - (e.g. \'{ "rules": { "no-implicit-this": "error" } }\') ',
        type: 'string',
      },
      quiet: {
        describe: 'Ignore warnings and only show errors',
        boolean: true,
      },
      rule: {
        describe:
          'Specify a rule and its severity to add that rule to loaded rules - (e.g. `no-implicit-this:error` or `rule:["error", { "allow": ["some-helper"] }]`)',
        type: 'string',
      },
      filename: {
        describe: 'Used to indicate the filename to be assumed for contents from STDIN',
        type: 'string',
      },
      fix: {
        describe: 'Fix any errors that are reported as fixable',
        boolean: true,
        default: false,
      },
      json: {
        describe: 'Format output as json',
        boolean: true,
      },
      verbose: {
        describe: 'Output errors with source description',
        boolean: true,
      },
      'no-config-path': {
        describe:
          'Does not use the local template-lintrc, will use a blank template-lintrc instead',
        boolean: true,
      },
      'print-pending': {
        describe: 'Print list of formated rules for use with `pending` in config file',
        boolean: true,
      },
      'ignore-pattern': {
        describe: 'Specify custom ignore pattern (can be disabled with --no-ignore-pattern)',
        type: 'array',
        default: ['**/dist/**', '**/tmp/**', '**/node_modules/**'],
      },
    })
    .help()
    .version();

  parser.parserConfiguration({
    'greedy-arrays': false,
  });

  if (_argv.length === 0) {
    parser.showHelp();
    parser.exit(1);
  } else {
    let options = parser.parse(_argv);
    return options;
  }
}

const PENDING_RULES = ['invalid-pending-module', 'invalid-pending-module-rule'];
function printPending(results, options) {
  let pendingList = [];
  for (let filePath in results.files) {
    let fileResults = results.files[filePath];
    let failingRules = fileResults.messages.reduce((memo, error) => {
      if (!PENDING_RULES.includes(error.rule)) {
        memo.add(error.rule);
      }

      return memo;
    }, new Set());

    if (failingRules.size > 0) {
      pendingList.push({ moduleId: filePath.slice(0, -4), only: Array.from(failingRules) });
    }
  }
  let pendingListString = JSON.stringify(pendingList, null, 2);

  if (options.json) {
    console.log(pendingListString);
  } else {
    console.log(
      'Add the following to your `.template-lintrc.js` file to mark these files as pending.\n\n'
    );

    console.log(`pending: ${pendingListString}`);
  }
}

async function run() {
  let options = parseArgv(process.argv.slice(2));
  let positional = options._;
  let config;

  if (options.config) {
    try {
      config = JSON.parse(options.config);
    } catch (error) {
      console.error('Could not parse specified `--config` as JSON');
      process.exitCode = 1;
      return;
    }
  }

  if (options['no-config-path'] !== undefined) {
    options.configPath = false;
  }

  let linter;
  try {
    linter = new Linter({
      configPath: options.configPath,
      config,
      rule: options.rule,
    });
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
    return;
  }

  let filePathsToLint = getFilesToLint(positional, options.ignorePattern);

  let resultsAccumulator = [];
  for (let relativeFilePath of filePathsToLint) {
    let messages = await lintFile(linter, relativeFilePath, options);

    resultsAccumulator.push(...messages);
  }

  let results = processResults(resultsAccumulator);
  if (results.errorCount > 0) {
    process.exitCode = 1;
  }

  if (options.printPending) {
    return printPending(results, options);
  } else {
    if (results.errorCount || results.warningCount) {
      let Printer = require('../lib/printers/default');
      let printer = new Printer(options);
      printer.print(results);
    }
  }
}

// exports are for easier unit testing
module.exports = {
  _parseArgv: parseArgv,
  _expandFileGlobs: expandFileGlobs,
  _getFilesToLint: getFilesToLint,
};

if (require.main === module) {
  run();
}
