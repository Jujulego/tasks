import { EventSource } from '@jujulego/event-tree';
import os from 'node:os';

import { ILogger, logger } from './logger';
import { AnyTask, Task } from './task';

// Types
export interface TaskManagerOpts {
  jobs?: number;
  logger?: ILogger;
}

export type TaskManagerEventMap = {
  added: Task;
  started: Task;
  completed: Task;
}

// Class
export class TaskManager extends EventSource<TaskManagerEventMap> {
  // Attributes
  private _jobs: number;

  private readonly _tasks: Task[] = [];
  private readonly _index = new Set<Task>();
  private readonly _running = new Set<Task>();

  protected readonly _logger: ILogger;

  // Constructor
  constructor(opts: TaskManagerOpts = {}) {
    super();

    this._logger = opts.logger ?? logger;
    this._jobs = (opts.jobs && opts.jobs > 0) ? opts.jobs : os.cpus().length;
    this._logger.verbose(`Run up to ${this._jobs} tasks at the same time`);
  }

  // Methods
  private _sortByComplexity() {
    const cache = new Map<string, number>();
    this._tasks.sort((a, b) => a.complexity(cache) - b.complexity(cache));
  }

  private _add(task: Task) {
    if (this._index.has(task)) {
      return;
    }

    // Add task
    this._tasks.push(task);
    this._index.add(task);

    this.emit('added', task);

    // Add task's dependencies
    for (const t of task.dependencies) {
      this._add(t);
    }
  }

  private _startNext(previous?: Task) {
    // Emit completed for previous task
    if (previous) {
      this._running.delete(previous);
      this.emit('completed', previous);
    }

    // Start other tasks
    for (const t of this._tasks) {
      if (this._running.size >= this._jobs) {
        break;
      }

      if (t.status === 'ready') {
        t.subscribe('completed', () => this._startNext(t));

        t.start();
        this._running.add(t);

        this.emit('started', t);
      }
    }
  }

  add(task: AnyTask): void {
    this._add(task);
    this._sortByComplexity();
    this._startNext();
  }

  // Properties
  get tasks(): readonly Task[] {
    return this._tasks;
  }

  get jobs(): number {
    return this._jobs;
  }

  set jobs(jobs: number) {
    this._jobs = jobs;
    this._startNext();
  }
}
