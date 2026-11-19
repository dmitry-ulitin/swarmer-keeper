import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument } from './openapi.js';
import { setupApp } from './setup-app.js';

async function buildDoc() {
  const app = await NestFactory.create(AppModule, { logger: false });
  setupApp(app);
  const doc = buildOpenApiDocument(app);
  await app.close();
  return doc;
}

describe('buildOpenApiDocument', () => {
  it('описывает GET /api/health с operationId getHealth и ответом HealthDto', async () => {
    const doc = await buildDoc();
    const op = doc.paths['/api/health']?.get;
    expect(op?.operationId).toBe('getHealth');
    expect(JSON.stringify(op?.responses)).toContain('#/components/schemas/HealthDto');
    expect(doc.info.title).toBe('Swarmer Keeper API');
  });

  it('детерминирован: две сборки подряд дают одинаковый JSON', async () => {
    expect(JSON.stringify(await buildDoc())).toBe(JSON.stringify(await buildDoc()));
  });
});
