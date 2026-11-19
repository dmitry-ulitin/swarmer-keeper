import { pathToFileURL } from 'node:url';
import { PgBoss } from 'pg-boss';
import { type AppConfig, loadConfig, ROOT_ENV_PATH, withEnvFile } from './config.js';

/**
 * Создаёт pg-boss с обработчиком 'error'. Без него фоновая ошибка обслуживания
 * (например, Postgres перезапустился) выбрасывается как uncaught и роняет воркер.
 */
export function createBoss(databaseUrl: string): PgBoss {
  const boss = new PgBoss(databaseUrl);
  boss.on('error', (error) => console.error('pg-boss:', error));
  return boss;
}

/** Подключает pg-boss к PostgreSQL. Обработчики задач добавит модуль jobs. */
export async function startWorker(config: AppConfig): Promise<PgBoss> {
  const boss = createBoss(config.databaseUrl);
  try {
    await boss.start();
  } catch (error) {
    await boss.stop({ graceful: false }).catch(() => undefined);
    throw error;
  }
  return boss;
}

async function main(): Promise<void> {
  const boss = await startWorker(loadConfig(withEnvFile(ROOT_ENV_PATH, process.env)));
  console.log('pg-boss started');
  const shutdown = async () => {
    await boss.stop();
    process.exit(0);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    console.error('Воркер не запустился:', error);
    process.exit(1);
  });
}
