'use strict';

const execa = require('execa');
const Project = require('../helpers/fake-project');
const setupEnvVar = require('../helpers/setup-env-var');
const { setProjectConfigForErrors } = require('../helpers/set-config');

describe('ember-template-lint executable', function () {
  setupEnvVar('GITHUB_ACTIONS', null);
  setupEnvVar('FORCE_COLOR', '0');
  setupEnvVar('LC_ALL', 'en_US');

  // Fake project
  let project;
  beforeEach(function () {
    project = Project.defaultSetup();
    project.chdir();
    setProjectConfigForErrors(project);
  });

  afterEach(async function () {
    await project.dispose();
  });

  if (process.platform === 'win32') {
    describe('in Windows Command Prompt', function () {
      describe('command: `node ember-template-lint --filename template.hbs < template.hbs`', function () {
        it('reports errors to stdout', async function () {
          let result = await execa(
            process.execPath,
            [
              require.resolve('../../bin/ember-template-lint.js'),
              '--filename',
              'app/templates/application.hbs',
              '<',
              'app/templates/application.hbs',
            ],
            {
              shell: true,
              reject: false,
              cwd: project.path('.'),
            }
          );

          expect(result.stdout).toMatchInlineSnapshot(`
            "app/templates/application.hbs
              1:4  error  Non-translated string used  no-bare-strings
              1:25  error  Non-translated string used  no-bare-strings

            ✖ 2 problems (2 errors, 0 warnings)"
          `);
          expect(result.stderr).toBeFalsy();
        });
      });
    });
  }

  if (process.platform === 'linux' || process.platform === 'darwin') {
    describe('in unix bash', function () {
      describe('command: `cat template.hbs | ember-template-lint --filename template.hbs`', function () {
        it('has exit code 1 and reports errors to stdout', async function () {
          let result = await execa(
            'cat',
            [
              'app/templates/application.hbs',
              '|',
              require.resolve('../../bin/ember-template-lint.js'),
              '--filename',
              'app/templates/application.hbs',
            ],
            {
              shell: true,
              reject: false,
              cwd: project.path('.'),
            }
          );

          expect(result.exitCode).toEqual(1);
          expect(result.stdout).toMatchInlineSnapshot(`
            "app/templates/application.hbs
              1:4  error  Non-translated string used  no-bare-strings
              1:25  error  Non-translated string used  no-bare-strings

            ✖ 2 problems (2 errors, 0 warnings)"
          `);
          expect(result.stderr).toBeFalsy();
        });
      });

      describe('command: `cat template.hbs | ember-template-lint --filename template.hbs -`', function () {
        it('has exit code 1 and reports errors to stdout', async function () {
          let result = await execa(
            'cat',
            [
              'app/templates/application.hbs',
              '|',
              require.resolve('../../bin/ember-template-lint.js'),
              '--filename',
              'app/templates/application.hbs',
              '-',
            ],
            {
              shell: true,
              reject: false,
              cwd: project.path('.'),
            }
          );

          expect(result.exitCode).toEqual(1);
          expect(result.stdout).toMatchInlineSnapshot(`
            "app/templates/application.hbs
              1:4  error  Non-translated string used  no-bare-strings
              1:25  error  Non-translated string used  no-bare-strings

            ✖ 2 problems (2 errors, 0 warnings)"
          `);
          expect(result.stderr).toBeFalsy();
        });
      });

      describe('command: `ember-template-lint --filename template.hbs < template.hbs`', function () {
        it('has exit code 1 and reports errors to stdout', async function () {
          let result = await execa(
            require.resolve('../../bin/ember-template-lint.js'),
            ['--filename', 'app/templates/application.hbs', '<', 'app/templates/application.hbs'],
            {
              shell: true,
              reject: false,
              cwd: project.path('.'),
            }
          );

          expect(result.exitCode).toEqual(1);
          expect(result.stdout).toMatchInlineSnapshot(`
            "app/templates/application.hbs
              1:4  error  Non-translated string used  no-bare-strings
              1:25  error  Non-translated string used  no-bare-strings

            ✖ 2 problems (2 errors, 0 warnings)"
          `);
          expect(result.stderr).toBeFalsy();
        });
      });
    });
  }
});
