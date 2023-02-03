import wt from 'node:worker_threads';

import { Task, TaskContext, TaskEventMap, TaskOptions } from '../task';
import { WorkerPool } from './worker-pool';
import { EventMessage, ReadyMessage, SuccessMessage, RunMessage, FailureMessage } from './messages';

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
  abstract _handleMessage(payload: unknown): void;

  protected async _start(): Promise<void> {
    const worker = await this.pool.reserveWorker();
    this._worker = worker;

    worker.on('message', (message: ReadyMessage | EventMessage | SuccessMessage | FailureMessage) => {
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
          this._handleMessage(message.payload);
          break;
      }
    });

    worker.on('messageerror', (err) => {
      this._logger.warn(`Error while receiving a message from ${this.name}`, err);
    });

    worker.on('exit', (code) => {
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

    this._sendMessage({ type: 'run', payload: this.payload });
  }

  private _sendMessage(msg: RunMessage) {
    if (!wt.parentPort) {
      throw new Error('Should not be running in main thread');
    }

    wt.parentPort.postMessage(msg);
  }

  protected _stop(): void {
    this._worker?.terminate();
  }
}
