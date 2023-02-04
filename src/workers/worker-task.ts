import wt from 'node:worker_threads';

import { Task, TaskContext, TaskEventMap, TaskOptions } from '../task';
import { HandlerMessage, TaskMessage } from './messages';
import { WorkerPool } from './worker-pool';

// Class
export abstract class WorkerTask<C extends TaskContext = TaskContext, M extends TaskEventMap = TaskEventMap> extends Task<C, M> {
  // Attributes
  private _worker?: wt.Worker;

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
  protected _handleEvent(payload: unknown): void {
    return;
  }

  protected async _start(): Promise<void> {
    const worker = await this.pool.reserveWorker();
    this._worker = worker;

    worker.on('message', (message: HandlerMessage) => {
      switch (message.type) {
        case 'success':
          this.pool.freeWorker(worker);
          this.status = 'done';
          break;

        case 'failure':
          this.pool.freeWorker(worker);
          this._logger.error(`Error while running ${this.name}`, message.error);
          this.status = 'failed';

          break;

        case 'event':
          this._handleEvent(message.payload);
          break;
      }
    });

    worker.on('messageerror', (err) => {
      this._logger.warn(`Error while receiving a message from ${this.name}`, err);
    });

    worker.on('exit', (code) => {
      this.pool.freeWorker(worker);

      if (this.status === 'running') {
        this.status = code ? 'failed' : 'done';
      }
    });

    worker.on('error', (err) => {
      this._logger.error(`Error while running ${this.name}`, err);

      this.pool.freeWorker(worker);
      this.status = 'failed';
    });

    this._sendMessage({ type: 'run', payload: this.payload });
  }

  private _sendMessage(msg: TaskMessage) {
    if (!this._worker) {
      throw new Error('Worker thread is not ready yet');
    }

    this._worker.postMessage(msg);
  }

  protected _stop(): void {
    this._worker?.terminate();
  }
}
