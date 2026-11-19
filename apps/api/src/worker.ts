import { pathToFileURL } from 'node:url';
import { PgBoss } from 'pg-boss';
import { type AppConfig, loadConfig } from './config.js';

/** Подключает pg-boss к PostgreSQL. Обработчики задач добавит модуль jobs. */
export async function startWorker(config: AppConfig): Promise<PgBoss> {
  const boss = new PgBoss(config.databaseUrl);
  try {
    await boss.start();
  } catch (error) {
    await boss.stop({ graceful: false }).catch(() => undefined);
    throw error;
  }
  return boss;
}

async function main(): Promise<void> {
  const boss = await startWorker(loadConfig(process.env));
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
