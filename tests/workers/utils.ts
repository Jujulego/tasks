import { WorkerHandler } from '@/src/workers/worker-handler.js';
import { WorkerPool } from '@/src/workers/worker-pool.js';
import { WorkerTask } from '@/src/workers/worker-task.js';
import { EventEmitter } from 'node:events';
import type wt from 'node:worker_threads';
import { vi } from 'vitest';

import { spyLogger } from '../utils.js';

// Test pool
export class WorkerPoolTest extends WorkerPool {
  // Methods
  onStart(): wt.Worker {
    const worker = new EventEmitter();

    Object.assign(worker, {
      ref: vi.fn(),
      unref: vi.fn(),
    });

    vi.spyOn(worker, 'on');
    vi.spyOn(worker, 'removeAllListeners');

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
  onEvent = vi.fn();
}

// Test handler
export class WorkerHandlerTest extends WorkerHandler {
  // Methods
  _run = vi.fn();
}
