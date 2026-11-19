# Swarmer Keeper — монорепо

Семейный архив фото и документов. Архитектура: @docs/architecture.md —
прочитай перед изменениями в модели данных, хранении файлов или доступе.

## Структура

- apps/api — бэкенд (NestJS, PostgreSQL, pg-boss)
- apps/web — фронтенд (Angular)
- packages/api-client — клиент, генерируется из OpenAPI, руками не правим

## Команды (из корня)

- docker compose up -d --wait — Postgres (:5433), Garage S3 (:9000), Keycloak (:8080); нужен для pnpm dev
- pnpm dev / pnpm test / pnpm lint
- pnpm gen:client — после любых изменений API-контракта

## Сквозные правила

- Каждая таблица с данными семьи содержит family_id; RLS обязателен
- Изменил API → перегенерируй клиент → поправь web в том же коммите
- Решения, противоречащие docs/architecture.md, сначала обсуждаем
