import type { INestApplication } from '@nestjs/common';

/** Общая настройка приложения для HTTP-сервера, тестов и генерации OpenAPI. */
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
}
