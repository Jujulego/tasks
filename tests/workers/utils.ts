import wt from 'node:worker_threads';
import { EventEmitter } from 'node:events';

import { WorkerHandler, WorkerPool, WorkerTask } from '../../src';
import { spyLogger } from '../utils';

// Test pool
export class WorkerPoolTest extends WorkerPool {
  // Methods
  public _start(): wt.Worker {
    const worker = new EventEmitter();

    jest.spyOn(worker, 'on');
    jest.spyOn(worker, 'removeAllListeners');

    setTimeout(() => worker.emit('message', { type: 'ready' }), 0);

    return worker as wt.Worker;
  }
}

// Test task
export class WorkerTaskTest extends WorkerTask {
  // Constructor
  constructor(readonly name: string, pool: WorkerPool, payload: unknown) {
    super(pool, payload, {}, { logger: spyLogger });
  }

  // Methods
  _handleEvent = jest.fn();
}

// Test handler
export class WorkerHandlerTest extends WorkerHandler {
  // Methods
  _run = jest.fn();
}
