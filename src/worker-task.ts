import wt from 'node:worker_threads';

import { Task, TaskContext, TaskEventMap, TaskOptions } from './task';

// Class
export abstract class WorkerTask<C extends TaskContext = TaskContext, M extends TaskEventMap = TaskEventMap> extends Task<C, M> {
  // Attributes
  private _worker?: wt.Worker;
  private _exitCode: number | null = null;

  // Constructor
  constructor(
    readonly pool: () => wt.Worker, // TODO: add a pool object to manage workers
    readonly payload: unknown,
    context: C,
    opts: TaskOptions = {}
  ) {
    super(context, opts);
  }

  // Methods
  abstract _handleMessage(message: any): void;

  protected _start(): void {
    this._worker = this.pool();

    this._worker.on('message', (result) => this._handleMessage(result));

    this._worker.on('exit', (code) => {
      this._exitCode = code;

      if (code && this.status === 'running') {
        this.status = 'failed';
      } else {
        this.status = 'done';
      }
    });

    this._worker.on('error', (err) => {
      this._logger.warn(`Error while running ${this.name}: ${err}`);
      this.status = 'failed';
    });

    this._worker.postMessage(this.payload);
  }

  protected _stop(): void {
    this._worker?.terminate();
  }
}
