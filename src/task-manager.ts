import { EventSource } from '@jujulego/event-tree';
import os from 'node:os';

import { ILogger, logger } from './logger';
import { Task, TaskContext } from './task';

// Types
export interface TaskManagerOpts {
  jobs?: number;
  logger?: ILogger;
}

export type TaskManagerEventMap<C extends TaskContext = TaskContext> = {
  started: Task<C>;
  completed: Task<C>;
}

// Class
export class TaskManager<C extends TaskContext = TaskContext> extends EventSource<TaskManagerEventMap<C>> {
  // Attributes
  private _jobs: number;

  private readonly _tasks: Task<C>[] = [];
  private readonly _index = new Set<Task<C>>();
  private readonly _running = new Set<Task<C>>();

  protected readonly _logger: ILogger;

  // Constructor
  constructor(opts: TaskManagerOpts = {}) {
    super();

    this._logger = opts.logger ?? logger;
    this._jobs = (opts.jobs && opts.jobs > 0) ? opts.jobs : os.cpus().length;
    this._logger.verbose(`Run up to ${this._jobs} tasks at the same time`);
  }

  // Statics
  private static _instance?: TaskManager<any>;

  static get global(): TaskManager<any> {
    if (!this._instance) {
      this._instance = new TaskManager();
    }

    return this._instance;
  }

  // Methods
  private _sortByComplexity() {
    const cache = new Map<Task<C>, number>();
    this._tasks.sort((a, b) => a.complexity(cache) - b.complexity(cache));
  }

  private _add(task: Task<C>) {
    if (this._index.has(task)) {
      return;
    }

    // Add task and it's dependencies
    this._tasks.push(task);
    this._index.add(task);

    for (const t of task.dependencies) {
      this._add(t);
    }
  }

  private _startNext(previous?: Task<C>) {
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
        t.subscribe('status.done', () => this._startNext(t));
        t.subscribe('status.failed', () => this._startNext(t));

        t.start();
        this._running.add(t);

        this.emit('started', t);
      }
    }
  }

  add(task: Task<C>): void {
    this._add(task);
    this._sortByComplexity();
    this._startNext();
  }

  // Properties
  get tasks(): readonly Task<C>[] {
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
