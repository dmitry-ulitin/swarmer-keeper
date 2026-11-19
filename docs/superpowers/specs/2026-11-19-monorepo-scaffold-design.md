> При исполнении этот документ сохраняется в `docs/superpowers/specs/2026-11-19-monorepo-scaffold-design.md` и коммитится; дальше — план через superpowers:writing-plans.

## Context
Проект пустой (только `CLAUDE.md`, `docs/architecture.md`, `.claude/skills`; git нет). Нужен рабочий pnpm-монорепо по структуре из `CLAUDE.md`, чтобы сразу писать модули из архитектуры. Корневые `pnpm dev / test / lint / gen:client` должны реально работать, а цепочка «изменил API → перегенерировал клиент → поправил web» — исполняться одной командой.

## Цели / не-цели
- **Цели:** запускаемые `apps/api` (API + воркер), `apps/web` (Angular + Taiga UI), сгенерированный `packages/api-client`; dev-инфраструктура в Docker Compose; сквозная проверка web → client → api.
- **Не-цели:** доменные модули (identity, assets…), выбор Kysely/Drizzle, миграции, RLS, OIDC-авторизация, CI, мобильное приложение.
- **Анти-цели:** собственная оркестрация поверх CLI (Nx-подобные executors); ручные правки в api-client; отдельный `apps/worker` вопреки архитектуре.

## Подходы (выбран A)
- **A. Только pnpm workspaces** — скрипты `pnpm -r` / `--filter`. Выбран: минимум инструментов, Turborepo добавляется позже одним файлом.
- B. pnpm + Turborepo — кэш и граф задач; для 3 пакетов пока избыточно.
- C. Nx — тяжёлый, уводит от стандартных Nest/Angular CLI.

## Структура
```
/
├─ package.json            private, packageManager pnpm@12.14.0, engines node>=26
├─ pnpm-workspace.yaml     apps/*, packages/*
├─ docker-compose.yml      postgres, minio (+ создание бакета), keycloak (dev-режим)
├─ .env.example  .gitignore  .editorconfig  .nvmrc  .prettierrc  eslint.config.mjs
├─ apps/
│  ├─ api/                 nest new (--skip-git, pnpm)
│  │  ├─ src/main.ts       HTTP, префикс /api, Swagger
│  │  ├─ src/worker.ts     createApplicationContext + pg-boss start
│  │  ├─ src/openapi.ts    собирает приложение без listen → пишет openapi.json
│  │  ├─ src/app.module.ts, src/health/   GET /api/health (DTO для OpenAPI)
│  │  ├─ src/modules/      пусто (.gitkeep)
│  │  └─ openapi.json      коммитится — изменения контракта видны в диффе
│  └─ web/                 ng new (standalone, по скиллу angular-new-app) + Taiga UI (скилл taiga-ui-setup)
│     └─ главная страница вызывает health через api-client и показывает статус; proxy /api → :3000
└─ packages/
   ├─ tsconfig/            base.json, node.json — общие настройки
   └─ api-client/          ng-openapi-gen из ../../apps/api/openapi.json → src/ (коммитится, руками не правим)
```

## Корневые скрипты
- `dev` — параллельно `api dev`, `api dev:worker`, `web start`
- `gen:client` — `api openapi` → `api-client generate`
- `test` / `lint` / `format` — `pnpm -r`

## Решения, принятые мной (можно оспорить)
- Генератор клиента — `ng-openapi-gen` (Angular-сервисы на HttpClient).
- Тесты — Vitest и в api (с SWC для декораторов), и в web; ESLint flat config + Prettier.
- web подключает api-client как workspace-зависимость `@swarmer-keeper/api-client`; если Angular-сборщик не компилирует TS из пакета — через tsconfig `paths` на `packages/api-client/src`.
- Nest на дефолтном Express-адаптере.
- Postgres 18, MinIO, Keycloak `start-dev` — порты и креды в `.env.example`.
- `git init` и первый коммит каркаса.

## Оставлено исполнителю
Точные версии зависимостей (актуальные стабильные), имена пакетов `@swarmer-keeper/*`, конкретные порты.

## Проверка
1. `pnpm install` без ошибок; `docker compose up -d` — все сервисы healthy.
2. `pnpm gen:client` дважды подряд → второй раз без диффа.
3. `pnpm lint` и `pnpm test` зелёные.
4. `pnpm dev`: `curl localhost:3000/api/health` → ok; воркер пишет в лог, что pg-boss стартовал; web на :4200 показывает статус API через api-client.
