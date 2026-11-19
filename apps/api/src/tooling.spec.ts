import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const apiRoot = resolve(import.meta.dirname, '..');

describe('run:ts (запускатель для openapi и dev:worker)', () => {
  it('эмитит design:paramtypes, иначе DI Nest и схемы DTO в openapi.json ломаются', () => {
    const out = execFileSync('pnpm', ['--silent', 'run:ts', 'test-fixtures/metadata-probe.ts'], {
      cwd: apiRoot,
      encoding: 'utf8',
    });
    expect(out.trim()).toBe('metadata-ok');
  }, 30_000);
});
