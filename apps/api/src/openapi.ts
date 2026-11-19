import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { setupApp } from './setup-app.js';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder().setTitle('Swarmer Keeper API').setVersion('0.1.0').build();
  return SwaggerModule.createDocument(app, config);
}

/** Пишет openapi.json без запуска HTTP-сервера и без обращения к БД. */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  setupApp(app);
  const doc = buildOpenApiDocument(app);
  await app.close();
  const out = resolve(import.meta.dirname, '../openapi.json');
  await writeFile(out, JSON.stringify(doc, null, 2) + '\n');
  console.log(`OpenAPI записан в ${out}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
