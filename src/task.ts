import { group$, Listenable, multiplexer$, source$ } from '@jujulego/event-tree';
import { Logger } from '@jujulego/logger';
import crypto from 'node:crypto';

import { GroupTask } from './group-task.js';
import { logger } from './logger.js';
import { TaskManager } from './task-manager.js';

// Types
export type TaskContext = Record<string, unknown>;

export interface TaskOptions {
  id?: string;
  logger?: Logger;
  weight?: number;
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

export type TaskStatus = 'blocked' | 'ready' | 'starting' | 'running' | 'done' | 'failed';
export interface TaskStatusEvent<S extends TaskStatus = TaskStatus> {
  previous: TaskStatus;
  status: S;
}

export interface TaskCompletedEvent {
  status: 'done' | 'failed';
  duration: number;
}

export type TaskEventMap = {
  completed: TaskCompletedEvent;
  status: TaskStatusEvent;
  'status.blocked': TaskStatusEvent<'blocked'>;
  'status.ready': TaskStatusEvent<'ready'>;
  'status.starting': TaskStatusEvent<'starting'>;
  'status.running': TaskStatusEvent<'running'>;
  'status.done': TaskStatusEvent<'done'>;
  'status.failed': TaskStatusEvent<'failed'>;
};

// Class
export abstract class Task<C extends TaskContext = TaskContext> implements Listenable<TaskEventMap> {
  // Attributes
  private _status: TaskStatus = 'ready';
  private _dependencies: Task[] = [];
  private _group?: GroupTask;
  private _startTime = 0;
  private _endTime = 0;

  readonly context: C;
  readonly id: string;
  readonly weight: number;

  protected readonly _logger: Logger;
  protected readonly _taskEvents = multiplexer$({
    completed: source$<TaskCompletedEvent>(),
    status: group$({
      'blocked': source$<TaskStatusEvent<'blocked'>>(),
      'ready': source$<TaskStatusEvent<'ready'>>(),
      'starting': source$<TaskStatusEvent<'starting'>>(),
      'running': source$<TaskStatusEvent<'running'>>(),
      'done': source$<TaskStatusEvent<'done'>>(),
      'failed': source$<TaskStatusEvent<'failed'>>(),
    }),
  });

  // Constructor
  protected constructor(context: C, opts: TaskOptions = {}) {
    // Parse options
    this.context = context;
    this.id = opts.id ?? crypto.randomUUID();
    this.weight = opts.weight ?? 1;
    this._logger = opts.logger ?? logger;
  }

  // Methods
  readonly on = this._taskEvents.on;
  readonly off = this._taskEvents.off;
  readonly keys = this._taskEvents.keys;
  readonly clear = this._taskEvents.clear;

  protected abstract _start(manager?: TaskManager): void;
  protected abstract _stop(): void;

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
   * @param status
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

    this._logger.debug(`${this.name} is ${status}`);
    this._taskEvents.emit(`status.${status}`, { previous, status });

    // Emit completed
    if (status === 'done' || status === 'failed') {
      this._endTime = Date.now();

      this._taskEvents.emit('completed', {
        status,
        duration: this.duration,
      });
    }
  }

  /**
   * Add a dependency to this task.
   * A task will be blocked as long as all it's dependencies aren't done.
   * If a task fails, all tasks that depends on it will also fail without running.
   *
   * @param task the dependency to add
   */
  dependsOn(task: Task): void {
    if (['blocked', 'ready'].includes(this._status)) {
      this._dependencies.push(task);
      this._recomputeStatus();

      task.on('status.done', () => {
        this._recomputeStatus();
      });

      task.on('status.failed', () => {
        this._recomputeStatus();
      });
    } else {
      throw Error(`Cannot add a dependency to a ${this._status} task`);
    }
  }

  /**
   * @internal
   */
  setGroup(group: GroupTask): void {
    this._group = group;
  }

  /**
   * Computes task complexity.
   * The task complexity equals to the count of all it's direct and indirect dependencies.
   *
   * @param cache stores all computed complexities, to not recompute complexities while running threw the whole graph.
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
   * Start the task.
   * The task will be started only if it's status is "ready".
   * In other cases, it will throw an error.
   */
  start(manager?: TaskManager): void {
    if (this._status !== 'ready') {
      throw Error(`Cannot start a ${this._status} task`);
    }

    this._logger.verbose(`Starting ${this.name}`);
    this.setStatus('starting');
    this._startTime = Date.now();

    this._start(manager);
  }

  /**
   * Stop the task.
   * The task will be stopped only if it's status is "starting" or "running".
   * In other cases, it won't do anything.
   */
  stop(): void {
    if (['starting', 'running'].includes(this._status)) {
      this._logger.verbose(`Stopping ${this.name}`);
      this._stop();
    }
  }

  // Properties
  abstract get name(): string;

  get dependencies(): ReadonlyArray<Task> {
    return this._dependencies;
  }

  get group(): GroupTask | undefined {
    return this._group;
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

  get status(): TaskStatus {
    return this._status;
  }

  /** @deprecated Use setStatus method instead */
  protected set status(status: TaskStatus) {
    this.setStatus(status);
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
