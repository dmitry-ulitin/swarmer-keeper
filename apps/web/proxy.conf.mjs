// Dev-прокси: /api → локальный API. Порт берётся из API_PORT (окружение или корневой .env).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

const envPath = resolve(import.meta.dirname, '../../.env');
const fileEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const apiPort = process.env.API_PORT ?? fileEnv.API_PORT ?? '3000';

export default {
  '/api': {
    target: `http://localhost:${apiPort}`,
    secure: false,
  },
};
