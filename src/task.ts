import { type Logger, logger$ } from '@kyrielle/logger';
import { group$, multiplexer$, source$ } from 'kyrielle';
import crypto from 'node:crypto';
import type { GroupTask } from './groups/index.js';
import type { TaskManager } from './task-manager.legacy.js';

/**
 * Represents a task state
 */
export abstract class Task<C extends TaskContext = TaskContext> {
  // Attributes
  private _dependencies: Task[] = [];
  private _group?: GroupTask;
  private _status: TaskStatus = 'ready';
  private _startTime = 0;
  private _endTime = 0;

  readonly context: C;
  readonly id: string;
  readonly weight: number;

  readonly events$ = multiplexer$({
    completed: source$<TaskEventCompleted>(),
    status: group$({
      blocked: source$<TaskEventStatus<'blocked'>>(),
      ready: source$<TaskEventStatus<'ready'>>(),
      starting: source$<TaskEventStatus<'starting'>>(),
      running: source$<TaskEventStatus<'running'>>(),
      done: source$<TaskEventStatus<'done'>>(),
      failed: source$<TaskEventStatus<'failed'>>(),
    })
  });
  readonly logger$: Logger;

  // Constructor
  protected constructor(context: C, opts: TaskOptions = {}) {
    this.context = context;
    this.id = opts.id ?? crypto.randomUUID();
    this.logger$ = opts.logger ?? logger$();
    this.weight = opts.weight ?? 1;
  }

  // Abstract methods
  /**
   * Called to start the task.
   * @protected
   */
  protected abstract onStart(manager?: TaskManager): void;

  /**
   * Called to stop the task.
   * @protected
   */
  protected abstract onStop(): void;

  // Methods
  private _recomputeStatus(): void {
    if (['blocked', 'ready'].includes(this._status)) {
      if (this._dependencies.some(dep => dep.status === 'failed')) {
        // Check if one dependency is failed
        this.setStatus('failed');
      } else if (this._dependencies.every(dep => dep.status === 'done')) {
        // Check if all dependencies are done
        this.setStatus('ready');
      } else {
        this.setStatus('blocked');
      }
    }
  }

  /**
   * Changes tasks status
   * @protected
   */
  protected setStatus(status: TaskStatus) {
    // Ignore no change
    if (this._status === status) {
      return;
    }

    // Update, log and emit
    const previous = this._status;
    this._status = status;

    this.logger$.debug(`${this.name} status changed to ${status} (was ${previous})`);
    this.events$.emit(`status.${status}`, { previous, status });

    // Emit completed
    if (status === 'done' || status === 'failed') {
      this._endTime = Date.now();

      this.events$.emit('completed', {
        status,
        duration: this.duration,
      });
    }
  }

  /**
   * Add a dependency to this task.
   * A task will be blocked as long as all its dependencies aren't done.
   * If a task fails, all tasks that depend on it will also fail without running.
   */
  dependsOn(task: Task): void {
    if (['blocked', 'ready'].includes(this._status)) {
      this._dependencies.push(task);
      this._recomputeStatus();

      task.events$.on('status.done', () => {
        this._recomputeStatus();
      });

      task.events$.on('status.failed', () => {
        this._recomputeStatus();
      });
    } else {
      throw Error(`Cannot add a dependency to a ${this._status} task`);
    }
  }

  /**
   * Computes task complexity.
   * The task complexity equals to the count of all its direct and indirect dependencies.
   */
  complexity(cache: Map<string, number> = new Map()): number {
    let complexity = cache.get(this.id);

    if (complexity === undefined) {
      complexity = this.weight;

      for (const dep of this._dependencies) {
        complexity += dep.complexity(cache);
      }

      cache.set(this.id, complexity);
    }

    return complexity;
  }

  /**
   * @internal
   */
  setGroup(group: GroupTask): void {
    this._group = group;
  }

  /**
   * Start the task.
   * The task will be started only if its status is "ready".
   * In other cases, it will throw an error.
   */
  start(manager?: TaskManager): void {
    if (this._status !== 'ready') {
      throw Error(`Cannot start a ${this._status} task`);
    }

    this.logger$.verbose(`starting ${this.name}`);
    this.setStatus('starting');
    this._startTime = Date.now();

    this.onStart(manager);
  }

  /**
   * Stop the task.
   * The task will be stopped only if its status is "starting" or "running".
   * In other cases, it won't do anything.
   */
  stop(): void {
    if (['starting', 'running'].includes(this._status)) {
      this.logger$.verbose(`stopping ${this.name}`);
      this.onStop();
    }
  }

  // Properties
  abstract get name(): string;

  get dependencies(): readonly Task[] {
    return this._dependencies;
  }

  get completed(): boolean {
    return ['done', 'failed'].includes(this.status);
  }

  get duration(): number {
    if (!this._startTime) {
      return 0;
    }

    return (this._endTime || Date.now()) - this._startTime;
  }

  get group(): GroupTask | undefined {
    return this._group;
  }

  get status(): TaskStatus {
    return this._status;
  }

  get summary(): TaskSummary<C> {
    return {
      // metadata
      id: this.id,
      name: this.name,
      context: this.context,

      // status
      status: this.status,
      completed: this.completed,
      duration: this.duration,

      // relations
      isGroup: false,
      groupId: this.group?.id,
      dependenciesIds: this._dependencies.map((tsk) => tsk.id),
    };
  }
}

// Types
export type TaskContext = Record<string, unknown>;
export type TaskStatus = 'blocked' | 'ready' | 'starting' | 'running' | 'done' | 'failed';

export interface TaskOptions {
  /**
   * Task id. One uuid will be generated if omitted
   */
  readonly id?: string;

  /**
   * Logger to use.
   */
  readonly logger?: Logger;

  /**
   * Task weight. Cost to run the task, put a high value to limit
   * parallelization aside this task, defaults to 1.
   */
  readonly weight?: number;
}

export interface TaskSummary<C extends TaskContext = TaskContext> {
  // metadata
  readonly id: string;
  readonly name: string;
  readonly context: C;

  // status
  readonly status: TaskStatus;
  readonly completed: boolean;
  readonly duration: number;

  // relations
  readonly isGroup: boolean;
  readonly groupId?: string | undefined;
  readonly dependenciesIds: string[];
}

export interface TaskEventCompleted {
  readonly status: 'done' | 'failed';
  readonly duration: number;
}

export interface TaskEventStatus<S extends TaskStatus = TaskStatus> {
  readonly previous: TaskStatus;
  readonly status: S;
}
