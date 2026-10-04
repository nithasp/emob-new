#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');

const ENVIRONMENTS = {
  dev: 'development',
  test: 'test',
  prod: 'production',
};

const readVersion = () => {
  const packageJson = JSON.parse(
    readFileSync(join(projectDir, 'package.json'), 'utf8')
  );
  return packageJson.version;
};

const parseTargets = (argv) => {
  const requested = argv.length === 0 ? ['all'] : argv;
  if (requested.includes('all')) {
    return Object.keys(ENVIRONMENTS);
  }

  const unknown = requested.filter((name) => !(name in ENVIRONMENTS));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown environment(s): ${unknown.join(', ')}. ` +
        `Expected any of: ${Object.keys(ENVIRONMENTS).join(', ')}, all.`
    );
  }

  return [...new Set(requested)];
};

const prefixLines = (chunk, label) =>
  chunk
    .toString()
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => `[${label}] ${line}`)
    .join('\n');

const build = (env, outputPath) =>
  new Promise((resolvePromise) => {
    const child = spawn(
      process.execPath,
      [
        join(projectDir, 'node_modules/@angular/cli/bin/ng.js'),
        'build',
        `--configuration=${ENVIRONMENTS[env]}`,
        `--output-path=${outputPath}`,
      ],
      { cwd: projectDir, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    child.stdout.on('data', (chunk) => {
      const text = prefixLines(chunk, env);
      if (text) console.log(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = prefixLines(chunk, env);
      if (text) console.error(text);
    });

    child.on('close', (code) => resolvePromise({ env, outputPath, code }));
  });

const main = async () => {
  const targets = parseTargets(process.argv.slice(2));
  const version = readVersion();

  console.log(`Building ${targets.join(', ')} for version ${version}`);

  const results = await Promise.all(
    targets.map((env) => build(env, join('dist', version, env)))
  );

  console.log('\nBuild summary');
  for (const { env, outputPath, code } of results) {
    console.log(
      `  ${env.padEnd(5)} ${code === 0 ? 'ok    ' : 'failed'} ${outputPath}/browser`
    );
  }

  const failed = results.filter(({ code }) => code !== 0);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
