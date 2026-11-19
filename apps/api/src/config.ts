import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

export interface AppConfig {
  port: number;
  databaseUrl: string;
}

// Значения по умолчанию совпадают с .env.example и docker-compose.yml.
const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_URL = 'postgres://keeper:keeper@localhost:5433/keeper';

/** Корневой .env монорепо (тот же, что читает docker compose). Путь верен и из src/, и из dist/. */
export const ROOT_ENV_PATH = resolve(import.meta.dirname, '../../../.env');

/** Добавляет к окружению значения из .env-файла, если он есть. Переменные процесса важнее файла. */
export function withEnvFile(path: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (!existsSync(path)) return env;
  return { ...parseEnv(readFileSync(path, 'utf8')), ...env };
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const rawPort = env.API_PORT ?? String(DEFAULT_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`API_PORT должен быть числом 1–65535, получено: "${rawPort}"`);
  }
  return { port, databaseUrl: env.DATABASE_URL ?? DEFAULT_DATABASE_URL };
}
