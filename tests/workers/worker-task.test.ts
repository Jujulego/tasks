import { EventEmitter } from 'node:events';
import wt from 'node:worker_threads';
import { vi } from 'vitest';

import { WorkerPool } from '@/src/workers/worker-pool';
import { WorkerPoolTest, WorkerTaskTest } from './utils';

// Setup
let pool: WorkerPool;
let task: WorkerTaskTest;

let worker: wt.Worker;

beforeEach(() => {
  pool = new WorkerPoolTest(1);
  task = new WorkerTaskTest('test', pool, { test: true });

  worker = new EventEmitter() as wt.Worker;

  Object.assign(worker, {
    postMessage: vi.fn(),
    terminate: vi.fn(),
  });

  vi.spyOn(pool, 'reserveWorker').mockResolvedValue(worker);
  vi.spyOn(pool, 'freeWorker').mockImplementation();
});

// Tests
describe('WorkerTask.start', () => {
  it('should send run message to worker thread', async () => {
    task.start();

    expect(pool.reserveWorker).toHaveBeenCalled();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'run',
      payload: {
        test: true
      }
    });
  });

  it('should be runnning when receiving started message', async () => {
    task.start();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    worker.emit('message', { type: 'started' });

    expect(task.status).toBe('running');
  });

  it('should be done and free worker when receiving success message', async () => {
    task.start();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    worker.emit('message', { type: 'success' });

    expect(task.status).toBe('done');
    expect(pool.freeWorker).toHaveBeenCalledWith(worker);
  });

  it('should be failed and free worker when receiving failure message', async () => {
    task.start();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    worker.emit('message', { type: 'failure', error: new Error('Failed !') });

    expect(task.status).toBe('failed');
    expect(pool.freeWorker).toHaveBeenCalledWith(worker);
  });

  it('should call _handleEvent when receiving event message', async () => {
    task.start();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    worker.emit('message', { type: 'event', payload: { event: 'test' } });

    expect(task._handleEvent).toHaveBeenCalledWith({ event: 'test' });
  });

  it('should be done if worker exit successfully', async () => {
    task.start();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    worker.emit('exit', 0);

    expect(task.status).toBe('done');
    expect(pool.freeWorker).toHaveBeenCalledWith(worker);
  });

  it('should be failed if worker exit with error', async () => {
    task.start();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    worker.emit('exit', 1);

    expect(task.status).toBe('failed');
    expect(pool.freeWorker).toHaveBeenCalledWith(worker);
  });

  it('should be failed if worker emit an error', async () => {
    task.start();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    worker.emit('error', new Error('Failed !'));

    expect(task.status).toBe('failed');
    expect(pool.freeWorker).toHaveBeenCalledWith(worker);
  });

  it('should terminate worker on stop', async () => {
    task.start();

    // wait for pool to return worker
    await new Promise((resolve) => setTimeout(resolve, 0));

    task.stop();

    expect(worker.terminate).toHaveBeenCalled();
  });
});
