import { EventEmitter } from 'node:events';
import wt from 'node:worker_threads';
import * as util from 'util';

import { WorkerPool } from '../../src/workers/worker-pool';

// Test class
class WorkerPoolTest extends WorkerPool {
  // Methods
  public _start(): wt.Worker {
    const worker = new EventEmitter();

    jest.spyOn(worker, 'on');
    jest.spyOn(worker, 'removeAllListeners');

    setTimeout(() => worker.emit('message', { type: 'ready' }), 0);

    return worker as wt.Worker;
  }
}

// Setup
let pool: WorkerPoolTest;

beforeEach(() => {
  pool = new WorkerPoolTest(1);

  jest.spyOn(pool, '_start');
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

    await expect(prom).resolves.toBe(worker);

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
