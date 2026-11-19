import { createBoss, startWorker } from './worker.js';

describe('startWorker', () => {
  it('отклоняется, если Postgres недоступен, а не висит', async () => {
    await expect(
      startWorker({ port: 3000, databaseUrl: 'postgres://keeper:keeper@127.0.0.1:1/keeper' }),
    ).rejects.toThrow();
  }, 10_000);
});

describe('createBoss', () => {
  it('фоновая ошибка pg-boss не роняет процесс (есть обработчик error)', () => {
    const boss = createBoss('postgres://keeper:keeper@127.0.0.1:1/keeper');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => boss.emit('error', new Error('connection lost'))).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
