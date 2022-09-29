import { EventSource } from '@jujulego/event-tree';

import { ILogger, logger } from './logger';

// Types
export type TaskContext = Record<string, any>;
export interface TaskOptions {
  logger?: ILogger;
}

export type TaskStatus = 'blocked' | 'ready' | 'running' | 'done' | 'failed';
export interface TaskStatusEvent {
  previous: TaskStatus;
  status: TaskStatus;
}

export type TaskEventMap = Record<`status.${TaskStatus}`, TaskStatusEvent>;

// Class
export abstract class Task<C extends TaskContext = TaskContext, M extends TaskEventMap = TaskEventMap> extends EventSource<M> {
  // Attributes
  private _status: TaskStatus = 'ready';
  private _dependencies: Task<C>[] = [];

  protected readonly _logger: ILogger;

  // Constructor
  protected constructor(readonly context: Readonly<C>, opts: TaskOptions = {}) {
    super();

    this._logger = opts.logger ?? logger;
  }

  // Methods
  protected abstract _start(): void;
  protected abstract _stop(): void;

  private _recomputeStatus(): void {
    if (['blocked', 'ready'].includes(this._status)) {
      if (this._dependencies.some(dep => dep.status === 'failed')) {
        // Check if one dependency is failed
        this.status = 'failed';
      } else if (this._dependencies.every(dep => dep.status === 'done')) {
        // Check if all dependencies are done
        this.status = 'ready';
      } else {
        this.status = 'blocked';
      }
    }
  }

  /**
   * Add a dependency to this task.
   * A task will be blocked as long as all it's dependencies aren't done.
   * If a task fails, all tasks that depends on it will also fail without running.
   *
   * @param task the dependency to add
   */
  dependsOn(task: Task<C>): void {
    if (['blocked', 'ready'].includes(this._status)) {
      this._dependencies.push(task);
      this._recomputeStatus();

      task.subscribe('status.done', () => {
        this._recomputeStatus();
      });

      task.subscribe('status.failed', () => {
        this._recomputeStatus();
      });
    } else {
      throw Error(`Cannot add a dependency to a ${this._status} task`);
    }
  }

  /**
   * Computes task complexity.
   * The task complexity equals to the count of all it's direct and indirect dependencies.
   *
   * @param cache stores all computed complexities, to not recompute complexities while running threw the whole graph.
   */
  complexity(cache: Map<Task<C>, number> = new Map()): number {
    let complexity = cache.get(this);

    if (complexity === undefined) {
      complexity = 1;

      for (const dep of this._dependencies) {
        complexity += dep.complexity(cache);
      }

      cache.set(this, complexity);
    }

    return complexity;
  }

  /**
   * Start the task.
   * The task will be started only if it's status is "ready".
   * In other cases, it will throw an error.
   */
  start(): void {
    if (this._status !== 'ready') {
      throw Error(`Cannot start a ${this._status} task`);
    }

    this._logger.verbose(`Running ${this.name}`);
    this.status = 'running';
    this._start();
  }

  /**
   * Stop the task.
   * The task will be stopped only if it's status is "running".
   * In other cases, it won't do anything.
   */
  stop(): void {
    if (this._status !== 'running') {
      return;
    }

    this._logger.verbose(`Stopping ${this.name}`);
    this._stop();
  }

  // Properties
  abstract get name(): string;

  get dependencies(): ReadonlyArray<Task<C>> {
    return this._dependencies;
  }

  get completed(): boolean {
    return ['done', 'failed'].includes(this.status);
  }

  get status(): TaskStatus {
    return this._status;
  }

  protected set status(status: TaskStatus) {
    // Ignore no change
    if (this._status === status) {
      return;
    }

    // Update, log and emit
    const previous = this._status;
    this._status = status;

    this._logger.debug(`${this.name} is ${status}`);
    this.emit(`status.${status}`, { previous, status });
  }
}
