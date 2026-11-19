import { startWorker } from './worker.js';

describe('startWorker', () => {
  it('отклоняется, если Postgres недоступен, а не висит', async () => {
    await expect(
      startWorker({ port: 3000, databaseUrl: 'postgres://keeper:keeper@127.0.0.1:1/keeper' }),
    ).rejects.toThrow();
  }, 10_000);
});
