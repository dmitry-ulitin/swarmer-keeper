# Каркас монорепо Swarmer Keeper — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Рабочий pnpm-монорепо: NestJS API + воркер pg-boss, Angular + Taiga UI, сгенерированный api-client, dev-инфраструктура в Docker Compose.

**Architecture:** Только pnpm workspaces, без Turborepo/Nx. Один `apps/api` с тремя точками входа (`main.ts`, `worker.ts`, `openapi.ts`). Контракт идёт так: `apps/api/openapi.json` (коммитится) → `ng-openapi-gen` → `packages/api-client/src` (коммитится) → `apps/web`.

**Tech Stack:** Node 26, pnpm 12.14, TypeScript, NestJS (Express) + @nestjs/swagger, pg-boss, Vitest (+ unplugin-swc в api), Angular (актуальная стабильная версия) + Taiga UI, ng-openapi-gen, ESLint flat config, Prettier, Docker Compose (Postgres 18, MinIO, Keycloak).

**Spec:** `docs/superpowers/specs/2026-11-19-monorepo-scaffold-design.md`

## Global Constraints

- Корневой `package.json`: `"private": true`, `"packageManager": "pnpm@12.14.0"`, `"engines": { "node": ">=26" }`.
- `pnpm-workspace.yaml`: `apps/*`, `packages/*`.
- Имена пакетов: `@swarmer-keeper/api`, `@swarmer-keeper/web`, `@swarmer-keeper/api-client`, `@swarmer-keeper/tsconfig`.
- Порты: api 3000, web 4200, postgres 5432, minio 9000 (консоль 9001), keycloak 8080.
- Все маршруты API под префиксом `/api`.
- `packages/api-client/src` и `apps/api/openapi.json` генерируются и коммитятся, руками не правятся.
- Отдельного `apps/worker` нет: воркер — это вход `apps/api/src/worker.ts`.
- Доменных модулей, слоя доступа к БД, миграций, RLS и OIDC здесь нет. `apps/api/src/modules/` содержит только `.gitkeep`.
- Nest и Angular создаются своими CLI (`--skip-git`, `--package-manager pnpm`). Web делается по скиллам `angular-new-app` и `taiga-ui-setup`.
- Коммиты оканчиваются строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **API недоступен, а web открыт.** Пользователь должен увидеть состояние «API недоступен», а не пустую страницу или вечную загрузку. Тест в Task 4.
2. **`pnpm gen:client` запущен дважды.** Второй прогон не даёт диффа: генерация детерминирована, без меток времени. Проверка в Task 3.
3. **`openapi.ts` запущен без Docker и без `.env`.** Скрипт работает: генерация контракта не требует БД. Тест в Task 2.
4. **Воркер стартовал, а Postgres не поднят.** Процесс завершается с понятной ошибкой и ненулевым кодом, а не висит. Тест в Task 2.
5. **`.env` отсутствует.** API и воркер берут значения по умолчанию, совпадающие с `.env.example` и docker-compose. Тест в Task 2.

---

### Task 1: Корень workspace, общий tsconfig, инструменты, docker-compose

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.editorconfig`, `.nvmrc` (`26`), `.prettierrc`, `.prettierignore` (вкл. `packages/api-client/src`, `apps/api/openapi.json`), `eslint.config.mjs`, `.env.example`, `docker-compose.yml`
- Create: `packages/tsconfig/package.json`, `packages/tsconfig/base.json` (strict, ES2023, `skipLibCheck`), `packages/tsconfig/node.json` (extends base; `module`/`moduleResolution` `nodenext`, `experimentalDecorators`, `emitDecoratorMetadata`)
- Modify: `.gitignore` (добавить `*.log`, `.DS_Store`, `tmp/`)

**Interfaces:**
- Produces: `@swarmer-keeper/tsconfig/base.json` и `@swarmer-keeper/tsconfig/node.json` для расширения. Переменные `.env.example`: `API_PORT=3000`, `DATABASE_URL=postgres://keeper:keeper@localhost:5432/keeper`, `S3_ENDPOINT=http://localhost:9000`, `S3_BUCKET=keeper`, `S3_ACCESS_KEY=keeper`, `S3_SECRET_KEY=keeper-secret`, `KEYCLOAK_URL=http://localhost:8080`. Корневые скрипты `test`/`lint`/`format` (`pnpm -r test`, `pnpm -r lint`, `prettier --write .`). Скрипты `dev` и `gen:client` добавят Task 3 и Task 4.

- [ ] **Step 1: Создать файлы корня и `packages/tsconfig`.** В `docker-compose.yml` четыре сервиса:
  - `postgres:18` с healthcheck `pg_isready` и именованным томом;
  - `minio/minio` (`server /data --console-address :9001`) с healthcheck;
  - одноразовый `minio-init` (`minio/mc`), который создаёт бакет `keeper` и зависит от `minio: service_healthy`;
  - `quay.io/keycloak/keycloak` с `start-dev` и admin `admin/admin`.
  Креды берутся из переменных со значениями по умолчанию из `.env.example`.
- [ ] **Step 2: Проверить.** `pnpm install` завершается без ошибок. `docker compose config -q` возвращает 0. `docker compose up -d --wait postgres minio keycloak` возвращает 0, после этого `docker compose ps` показывает `healthy` у postgres и minio.
- [ ] **Step 3: Commit:** `chore: корень pnpm workspace, общий tsconfig, docker-compose`

### Task 2: apps/api — health, конфиг, OpenAPI, воркер

**Files:**
- Create (через `pnpm dlx @nestjs/cli new api --directory apps/api --skip-git --package-manager pnpm`, затем подчистить): `apps/api/package.json` (name `@swarmer-keeper/api`; убрать jest, добавить vitest, `unplugin-swc`, `@swc/core`, `@nestjs/swagger`, `pg-boss`, `tsx`), `apps/api/tsconfig.json` (extends `@swarmer-keeper/tsconfig/node.json`), `apps/api/vitest.config.ts`
- Create: `apps/api/src/config.ts`, `apps/api/src/app.module.ts`, `apps/api/src/setup-app.ts`, `apps/api/src/main.ts`, `apps/api/src/openapi.ts`, `apps/api/src/worker.ts`, `apps/api/src/health/health.controller.ts`, `apps/api/src/health/health.dto.ts`, `apps/api/src/modules/.gitkeep`, `apps/api/openapi.json` (сгенерирован)
- Test: `apps/api/src/config.spec.ts`, `apps/api/src/health/health.controller.spec.ts`, `apps/api/src/openapi.spec.ts`, `apps/api/src/worker.spec.ts`
- Delete: дефолтные `app.controller.ts`, `app.service.ts`, `test/` от Nest CLI

**Interfaces:**
- Produces:
  - `loadConfig(env: NodeJS.ProcessEnv): AppConfig`, где `AppConfig = { port: number; databaseUrl: string }`. Значения по умолчанию: `3000` и `postgres://keeper:keeper@localhost:5432/keeper`.
  - `setupApp(app: INestApplication): void` выставляет `setGlobalPrefix('api')`.
  - `buildOpenApiDocument(app: INestApplication): OpenAPIObject`: title `Swarmer Keeper API`, version `0.1.0`.
  - `GET /api/health` → `HealthDto { status: 'ok' }`, operationId `getHealth`, тег `health`.
  - `startWorker(config: AppConfig): Promise<PgBoss>`.
  - Скрипты пакета: `dev` (`nest start --watch`), `dev:worker` (`tsx watch src/worker.ts`), `openapi` (`tsx src/openapi.ts`, пишет `openapi.json` с отступом 2 и `\n` в конце), `test` (`vitest run`), `lint` (`eslint .`), `build`.

- [ ] **Step 1: Сгенерировать проект Nest CLI и перевести на Vitest + SWC.** Убедиться, что `pnpm --filter @swarmer-keeper/api test` запускается (тестов пока ноль, это допустимо: `--passWithNoTests`).
- [ ] **Step 2: Написать падающие тесты.**
  - `config.spec.ts`:
    - `loadConfig({})` → `{ port: 3000, databaseUrl: 'postgres://keeper:keeper@localhost:5432/keeper' }`;
    - `loadConfig({ API_PORT: '4000', DATABASE_URL: 'postgres://x' })` → `{ port: 4000, databaseUrl: 'postgres://x' }`;
    - `loadConfig({ API_PORT: 'abc' })` бросает ошибку, в сообщении которой есть `API_PORT`.
  - `health.controller.spec.ts`: Nest-приложение из `AppModule` + `setupApp` через supertest. `GET /api/health` отвечает 200 с телом `{ status: 'ok' }`.
  - `openapi.spec.ts`: `buildOpenApiDocument(app)` без переменных окружения и без БД. Проверить:
    - `doc.paths['/api/health'].get.operationId === 'getHealth'`;
    - схема ответа ссылается на `HealthDto`;
    - `JSON.stringify(doc)` для двух сборок подряд совпадает.
  - `worker.spec.ts`: `startWorker({ port: 3000, databaseUrl: 'postgres://keeper:keeper@127.0.0.1:1/keeper' })` отклоняется (rejects) за время меньше 10 с.
- [ ] **Step 3: Запустить и убедиться, что тесты падают** (`pnpm --filter @swarmer-keeper/api test`): модулей ещё нет.
- [ ] **Step 4: Реализовать модули.**
  - `config.ts`.
  - `HealthController` + `HealthDto`: `@ApiProperty({ enum: ['ok'] })`, `@ApiOperation({ operationId: 'getHealth' })`.
  - `setup-app.ts`.
  - `openapi.ts`:
    - экспортирует `buildOpenApiDocument`;
    - при прямом запуске создаёт приложение через `NestFactory.create(AppModule, { logger: false })` с `setupApp`, без `listen`;
    - пишет файл и закрывает приложение.
  - `main.ts`: `setupApp`, Swagger UI на `/api/docs`, `listen(config.port)`.
  - `worker.ts`:
    - экспортирует `startWorker`, который делает `new PgBoss(databaseUrl)` и `await boss.start()`;
    - при прямом запуске логирует `pg-boss started`;
    - при ошибке выводит `console.error` и делает `process.exit(1)`;
    - на SIGTERM/SIGINT вызывает `boss.stop()`.
- [ ] **Step 5: Тесты зелёные:** `pnpm --filter @swarmer-keeper/api test` → PASS (4 файла).
- [ ] **Step 6: Сгенерировать контракт:** `pnpm --filter @swarmer-keeper/api openapi` создаёт `apps/api/openapi.json`. Повторный запуск → `git diff --exit-code apps/api/openapi.json` возвращает 0.
- [ ] **Step 7: Ручная проверка с Docker.** При поднятом compose `pnpm --filter @swarmer-keeper/api dev`, затем `curl -s localhost:3000/api/health` → `{"status":"ok"}`. `pnpm --filter @swarmer-keeper/api dev:worker` пишет `pg-boss started`. При остановленном postgres воркер завершается с кодом ≠ 0. `pnpm --filter @swarmer-keeper/api lint` → 0.
- [ ] **Step 8: Commit:** `feat(api): каркас NestJS — health, конфиг, OpenAPI, воркер pg-boss`

### Task 3: packages/api-client и `pnpm gen:client`

**Files:**
- Create: `packages/api-client/package.json` (name `@swarmer-keeper/api-client`; `peerDependencies` `@angular/core`, `@angular/common`, `rxjs`; devDep `ng-openapi-gen`; `exports`/`types` → `./src/index.ts`; скрипт `generate`: `ng-openapi-gen -c ng-openapi-gen.json`), `packages/api-client/ng-openapi-gen.json` (`input: ../../apps/api/openapi.json`, `output: src`, `indexFile: true`, `removeStaleFiles: true`), `packages/api-client/src/**` (сгенерирован), `packages/api-client/README.md` (одна строка: «Генерируется `pnpm gen:client`, руками не править»)
- Modify: корневой `package.json`: `"gen:client": "pnpm --filter @swarmer-keeper/api openapi && pnpm --filter @swarmer-keeper/api-client generate"`

**Interfaces:**
- Consumes: `apps/api/openapi.json` (operationId `getHealth`, тег `health`, схема `HealthDto`).
- Produces: из `@swarmer-keeper/api-client` экспортируются `HealthService` с методом `getHealth(): Observable<HealthDto>`, тип `HealthDto` и `ApiConfiguration` (поле `rootUrl`). Если генератор называет их иначе, зафиксировать фактические имена в коммите: Task 4 использует именно их.

- [ ] **Step 1: Создать пакет и конфиг, добавить корневой скрипт.**
- [ ] **Step 2: Проверить генерацию.** `pnpm gen:client` возвращает 0, в `packages/api-client/src/index.ts` есть экспорты `HealthService` и `HealthDto`.
- [ ] **Step 3: Проверить детерминизм (Review Focus #2).** `git add -A && pnpm gen:client && git diff --exit-code` возвращает 0. Если генератор пишет метки времени или версию, отключить это в конфиге.
- [ ] **Step 4: Commit:** `feat(api-client): генерация клиента из OpenAPI, скрипт gen:client`

### Task 4: apps/web — Angular, Taiga UI, статус API

**Files:**
- Create (по скиллу `angular-new-app`: `ng new web --directory apps/web --skip-git --package-manager pnpm`, standalone): `apps/web/**`, `package.json` name `@swarmer-keeper/web`, зависимость `"@swarmer-keeper/api-client": "workspace:*"`, скрипты `start` (`ng serve --proxy-config proxy.conf.json`), `test`, `lint`, `build`
- Create: `apps/web/proxy.conf.json` (`/api` → `http://localhost:3000`), `apps/web/src/app/home/home.ts`, `apps/web/src/app/home/home.html`
- Modify: `apps/web/src/app/app.config.ts` (`provideHttpClient()`, `ApiConfiguration.rootUrl = ''`, провайдеры Taiga по скиллу `taiga-ui-setup`), `apps/web/src/app/app.routes.ts` (`''` → `Home`), `apps/web/tsconfig.json` (extends `@swarmer-keeper/tsconfig/base.json`, если CLI это допускает; иначе оставить как сгенерировано)
- Modify: корневой `package.json`: devDep `concurrently`, `"dev": "concurrently -n api,worker,web \"pnpm --filter @swarmer-keeper/api dev\" \"pnpm --filter @swarmer-keeper/api dev:worker\" \"pnpm --filter @swarmer-keeper/web start\""`
- Test: `apps/web/src/app/home/home.spec.ts`

**Interfaces:**
- Consumes: `HealthService.getHealth()` и `ApiConfiguration` из `@swarmer-keeper/api-client` (Task 3).
- Produces: компонент `Home` с сигналом `status: Signal<'loading' | 'ok' | 'down'>`. Текст на экране: «API: работает» / «API: недоступен» / «Проверяем API…».

- [ ] **Step 1: Создать приложение CLI и подключить Taiga UI по скиллам.** `pnpm --filter @swarmer-keeper/web build` возвращает 0 с пустой главной. Если сборщик не компилирует TS из `@swarmer-keeper/api-client`, добавить в `apps/web/tsconfig.json` `paths: { "@swarmer-keeper/api-client": ["../../packages/api-client/src/index.ts"] }`.
- [ ] **Step 2: Написать падающий тест `home.spec.ts`** со стабом `HealthService`:
  - `getHealth` возвращает `of({ status: 'ok' })` → `status()` равен `'ok'`, DOM содержит «API: работает»;
  - `getHealth` возвращает `throwError(() => new HttpErrorResponse({ status: 0 }))` → `status()` равен `'down'`, DOM содержит «API: недоступен» (Review Focus #1);
  - до ответа (`new Subject()`) DOM содержит «Проверяем API…».
- [ ] **Step 3: Запустить и убедиться, что тест падает:** `pnpm --filter @swarmer-keeper/web test`.
- [ ] **Step 4: Реализовать `Home`.** Вызывать `getHealth()` при создании, `status` через сигнал, разметку на компонентах Taiga UI (например, `tuiBadge` или `TuiNotification` с нужным appearance). Добавить маршрут.
- [ ] **Step 5: Тесты и lint зелёные:** `pnpm --filter @swarmer-keeper/web test` и `pnpm --filter @swarmer-keeper/web lint` возвращают 0.
- [ ] **Step 6: Добавить корневой `dev` и проверить вручную.** При поднятом compose `pnpm dev`: в логах API на :3000, `pg-boss started`, web на :4200. На http://localhost:4200 видно «API: работает». Остановить API → после перезагрузки страницы «API: недоступен».
- [ ] **Step 7: Commit:** `feat(web): Angular + Taiga UI, статус API через api-client; корневой pnpm dev`

### Task 5: Финальная сквозная проверка

**Files:**
- Modify: `CLAUDE.md` только если команды или структура разошлись с фактическими (например, нужен `docker compose up -d` перед `pnpm dev`; добавить строку в раздел «Команды»)

- [ ] **Step 1: Чистая установка.** `rm -rf node_modules apps/*/node_modules packages/*/node_modules && pnpm install` возвращает 0.
- [ ] **Step 2: Корневые команды.** `pnpm lint` → 0; `pnpm test` → 0 без запущенного Docker (тесты api и web не требуют БД); `pnpm gen:client && git diff --exit-code` → 0.
- [ ] **Step 3: Полный запуск.** `docker compose up -d --wait` → 0; `pnpm dev`: `curl -s localhost:3000/api/health` → `{"status":"ok"}`, на :4200 видно «API: работает».
- [ ] **Step 4: Commit** (если были правки): `docs: команды запуска в CLAUDE.md`
