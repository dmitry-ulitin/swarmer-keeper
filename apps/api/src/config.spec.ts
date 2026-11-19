import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('без переменных окружения берёт значения по умолчанию из .env.example', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      databaseUrl: 'postgres://keeper:keeper@localhost:5433/keeper',
    });
  });

  it('читает API_PORT и DATABASE_URL', () => {
    expect(loadConfig({ API_PORT: '4000', DATABASE_URL: 'postgres://x' })).toEqual({
      port: 4000,
      databaseUrl: 'postgres://x',
    });
  });

  it('отвергает нечисловой API_PORT', () => {
    expect(() => loadConfig({ API_PORT: 'abc' })).toThrow(/API_PORT/);
  });
});
