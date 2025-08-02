import { type Logger, logger$ } from '@kyrielle/logger';
import { multiplexer$, once$, source$ } from 'kyrielle';
import os from 'node:os';
import type { Task } from './task.js';

export class TaskManager {
  // Attributes
  private _jobs: number;
  private _runningWeight = 0;

  private readonly _index = new Set<Task>();
  private readonly _running = new Set<Task>();
  private readonly _tasks: Task[] = [];

  readonly events$ = multiplexer$({
    added: source$<Task>(),
    started: source$<Task>(),
    completed: source$<Task>(),
  });
  readonly logger$: Logger;

  // Constructor
  constructor(opts: TaskManagerOpts = {}) {
    this.logger$ = opts.logger ?? logger$();
    this._jobs = (opts.jobs && opts.jobs > 0) ? opts.jobs : os.cpus().length;
    this.logger$.verbose(`Run up to ${this._jobs} tasks at the same time`);
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

    this.events$.emit('added', task);

    // Add task's dependencies
    for (const t of task.dependencies) {
      this._add(t);
    }
  }

  private _startNext(previous?: Task) {
    // Emit completed for previous task
    if (previous) {
      this._running.delete(previous);
      this.events$.emit('completed', previous);
      this._runningWeight -= previous.weight;
    }

    // Start other tasks
    for (const task of this._tasks) {
      if (this._runningWeight >= this._jobs) {
        break;
      }

      if (task.status === 'ready') {
        once$(task.events$, 'completed', () => this._startNext(task));

        task.start(this);
        this._running.add(task);
        this._runningWeight += task.weight;

        this.events$.emit('started', task);
      }
    }
  }

  add(task: Task): void {
    this._add(task);
    this._sortByComplexity();
    this._startNext();
  }

  // Properties
  get jobs(): number {
    return this._jobs;
  }

  set jobs(jobs: number) {
    this._jobs = jobs;
    this.logger$.verbose(`Run up to ${this._jobs} tasks at the same time`);

    this._startNext();
  }

  get tasks(): readonly Task[] {
    return this._tasks;
  }
}

// Types
export interface TaskManagerOpts {
  /**
   * Maximum of parallel jobs allowed. Defaults to the number of cpus.
   *
   * Depends on task weight: a task with weight 2 will count as 2 jobs.
   */
  readonly jobs?: number;

  /**
   * Logger to use.
   */
  readonly logger?: Logger;
}
