import wt from 'node:worker_threads';

import { Task, TaskContext, TaskEventMap, TaskOptions } from '../task';
import { WorkerPool } from './worker-pool';

// Class
export abstract class WorkerTask<C extends TaskContext = TaskContext, M extends TaskEventMap = TaskEventMap> extends Task<C, M> {
  // Attributes
  private _worker?: wt.Worker;
  private _exitCode: number | null = null;

  // Constructor
  constructor(
    readonly pool: WorkerPool,
    readonly payload: unknown,
    context: C,
    opts: TaskOptions = {}
  ) {
    super(context, opts);
  }

  // Methods
  abstract _handleMessage(message: any): void;

  protected async _start(): Promise<void> {
    const worker = await this.pool.reserveWorker();
    this._worker = worker;

    worker.on('message', (result) => this._handleMessage(result));

    worker.on('messageerror', (err) => {
      this._logger.warn(`Error while receiving a message from ${this.name}`, err);
    });

    worker.on('exit', (code) => {
      this._exitCode = code;

      this.pool.freeWorker(worker);
      if (code && this.status === 'running') {
        this.status = 'failed';
      } else {
        this.status = 'done';
      }
    });

    worker.on('error', (err) => {
      this._logger.error(`Error while running ${this.name}`, err);

      this.pool.freeWorker(worker);
      this.status = 'failed';
    });

    worker.postMessage(this.payload);
  }

  protected _stop(): void {
    this._worker?.terminate();
  }
}
