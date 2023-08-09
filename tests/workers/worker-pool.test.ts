import util from 'util';
import { vi } from 'vitest';

import { WorkerPoolTest } from './utils.js';

// Setup
let pool: WorkerPoolTest;

beforeEach(() => {
  pool = new WorkerPoolTest(1);

  vi.spyOn(pool, '_start');
});

// Tests
describe('WorkerPool', () => {
  it('should start with 0 size', () => {
    expect(pool.size).toBe(0);
  });

  it('should resolve to a new worker', async () => {
    const worker = await pool.reserveWorker();

    expect(pool.size).toBe(1);

    expect(pool._start).toHaveBeenCalledTimes(1);
    expect(pool._start).toHaveReturnedWith(worker);

    expect(worker.on).toHaveBeenCalledWith('exit', expect.any(Function));
  });

  it('should resolve the same worker (on next call, after it is freed)', async () => {
    const worker = await pool.reserveWorker();
    const prom = pool.reserveWorker();

    // prom should still be pending
    expect(util.inspect(prom)).toMatch(/pending/);

    // Free worker
    pool.freeWorker(worker);

    expect(pool.size).toBe(1);
    expect(worker.unref).toHaveBeenCalled();

    await expect(prom).resolves.toBe(worker);

    expect(worker.ref).toHaveBeenCalled();
    expect(pool._start).toHaveBeenCalledTimes(1);
  });

  it('should resolve to an other worker (on next call, after it exited)', async () => {
    const worker = await pool.reserveWorker();
    const prom = pool.reserveWorker();

    // prom should still be pending
    expect(util.inspect(prom)).toMatch(/pending/);

    // Exit worker
    worker.emit('exit', 0);
    expect(pool.size).toBe(0);

    await expect(prom).resolves.not.toBe(worker);

    expect(pool._start).toHaveBeenCalledTimes(2);
  });
});
