/**
 * Runs all quality checks concurrently with streaming output.
 * Uses spawn instead of exec to avoid output buffer limits that can stall jobs.
 *
 * Usage: npm run quality:fast
 */
import { spawn } from 'node:child_process';

const parallelChecks = [
  'typecheck',
  'lint',
  'lint:css',
  'lint:md',
  'format:check',
  'i18n:coverage',
  'agents:validate',
  'prompts:validate',
  'instructions:validate',
  'vscode:extensions:validate',
  'mcp:metadata:validate',
  'ai:context:validate',
  'workflows:validate',
  'hooks:validate',
  'template:sync:validate',
  'components:budget',
];
// Vitest's PDF renderer worker needs substantially more startup memory than
// the metadata checks. Running it after the parallel batch avoids worker
// startup timeouts on Windows and lower-powered CI runners.
const serialChecks = ['pdf:budget'];
const PromiseCtor = globalThis.Promise;

function runCheck(name) {
  return new PromiseCtor((resolve) => {
    const child =
      process.platform === 'win32'
        ? spawn('cmd.exe', ['/d', '/s', '/c', `npm run ${name}`], {
            stdio: 'inherit',
          })
        : spawn('npm', ['run', name], {
            stdio: 'inherit',
          });

    child.on('close', (code) => {
      resolve({ name, code: code ?? 1 });
    });

    child.on('error', () => {
      resolve({ name, code: 1 });
    });
  });
}

const parallelResults = await PromiseCtor.all(parallelChecks.map((name) => runCheck(name)));
const serialResults = [];
for (const name of serialChecks) serialResults.push(await runCheck(name));
const results = [...parallelResults, ...serialResults];
const failed = results.filter((result) => result.code !== 0);

if (failed.length > 0) {
  const names = failed.map((result) => result.name).join(', ');
  console.error(`Quality checks failed: ${names}`);
  process.exit(1);
}

console.log('All quality checks passed');
