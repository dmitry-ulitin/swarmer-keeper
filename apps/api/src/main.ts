import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { loadConfig, ROOT_ENV_PATH, withEnvFile } from './config.js';
import { buildOpenApiDocument } from './openapi.js';
import { setupApp } from './setup-app.js';

const config = loadConfig(withEnvFile(ROOT_ENV_PATH, process.env));
const app = await NestFactory.create(AppModule);
setupApp(app);
SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app));
await app.listen(config.port);
