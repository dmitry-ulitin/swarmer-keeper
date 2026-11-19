export interface AppConfig {
  port: number;
  databaseUrl: string;
}

// Значения по умолчанию совпадают с .env.example и docker-compose.yml.
const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_URL = 'postgres://keeper:keeper@localhost:5433/keeper';

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const rawPort = env.API_PORT ?? String(DEFAULT_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`API_PORT должен быть числом 1–65535, получено: "${rawPort}"`);
  }
  return { port, databaseUrl: env.DATABASE_URL ?? DEFAULT_DATABASE_URL };
}
