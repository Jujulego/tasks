import { Condition } from '@jujulego/utils';
import wt from 'node:worker_threads';

import { HandlerMessage } from './messages';

// Class
export abstract class WorkerPool {
  // Attributes
  private _available: wt.Worker[] = [];
  private readonly _running = new Set<wt.Worker>();

  private readonly _hasFreeWorkers = new Condition(() => this._running.size < this.max);

  // Constructor
  constructor(readonly max: number) {}

  // Methods
  protected abstract _start(): wt.Worker;

  private _watchWorker(worker: wt.Worker): void {
    worker.on('exit', () => {
      this._available = this._available.filter((w) => w !== worker);
      this._running.delete(worker);

      this._hasFreeWorkers.check();
    });
  }

  private _waitForReady(worker: wt.Worker): Promise<void> {
    return new Promise<void>((resolve) => {
      const listener = (msg: HandlerMessage) => {
        if (msg.type === 'ready') {
          resolve();
          worker.removeListener('on', listener);
        }
      };

      worker.on('message', listener);
    });
  }

  private _startWorker(): wt.Worker {
    const worker = this._start();
    this._watchWorker(worker);

    return worker;
  }

  async reserveWorker(): Promise<wt.Worker> {
    await this._hasFreeWorkers.waitFor(true);

    const isNew = this._available.length === 0;
    const worker = this._available.pop() ?? this._startWorker();

    this._running.add(worker);
    this._hasFreeWorkers.check();

    if (isNew) {
      await this._waitForReady(worker);
    } else {
      worker.ref();
    }

    return worker;
  }

  freeWorker(worker: wt.Worker) {
    if (this._running.has(worker)) {
      this._available.unshift(worker);
      this._running.delete(worker);

      worker.unref();
      worker.removeAllListeners();
      this._watchWorker(worker);

      this._hasFreeWorkers.check();
    }
  }

  // Properties
  get size() {
    return this._available.length + this._running.size;
  }
}
