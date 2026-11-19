import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, withEnvFile } from './config.js';

describe('loadConfig', () => {
  it('без переменных окружения берёт значения по умолчанию из .env.example', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      databaseUrl: 'postgres://keeper:keeper@localhost:5433/keeper',
    });
  });

  it('читает API_PORT и DATABASE_URL', () => {
    expect(loadConfig({ API_PORT: '4000', DATABASE_URL: 'postgres://x' })).toEqual({
      port: 4000,
      databaseUrl: 'postgres://x',
    });
  });

  it('отвергает нечисловой API_PORT', () => {
    expect(() => loadConfig({ API_PORT: 'abc' })).toThrow(/API_PORT/);
  });
});

describe('withEnvFile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keeper-env-'));
  const file = join(dir, '.env');
  writeFileSync(file, 'API_PORT=4567\nDATABASE_URL=postgres://from-file\n');

  it('берёт значения из .env-файла', () => {
    expect(loadConfig(withEnvFile(file, {}))).toEqual({
      port: 4567,
      databaseUrl: 'postgres://from-file',
    });
  });

  it('переменные окружения процесса важнее файла', () => {
    expect(withEnvFile(file, { API_PORT: '5000' }).API_PORT).toBe('5000');
  });

  it('без файла возвращает окружение как есть', () => {
    expect(withEnvFile(join(dir, 'missing.env'), { A: '1' })).toEqual({ A: '1' });
  });
});
