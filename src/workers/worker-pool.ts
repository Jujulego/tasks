import wt from 'node:worker_threads';

import { Condition } from '../utils/condition';

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

  private _startWorker(): wt.Worker {
    const worker = this._start();
    this._watchWorker(worker);

    return worker;
  }

  async reserveWorker(): Promise<wt.Worker> {
    await this._hasFreeWorkers.waitFor(true);

    const worker = this._available.pop() ?? this._startWorker();
    this._running.add(worker);

    this._hasFreeWorkers.check();

    return worker;
  }

  freeWorker(worker: wt.Worker) {
    if (this._running.has(worker)) {
      this._available.unshift(worker);
      this._running.delete(worker);

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
