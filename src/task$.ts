import crypto from 'node:crypto';
import { multiplexer$, source$ } from 'kyrielle';

/**
 * Represents a task state
 */
export abstract class Task<C extends TaskContext = TaskContext> {
  // Attributes
  private _dependencies: Task[] = [];
  private _status: TaskStatus = 'ready';
  private _startTime = 0;
  private _endTime = 0;

  readonly context: C;
  readonly id: string;
  readonly weight: number;

  readonly events$ = multiplexer$({
    completed: source$<TaskEventCompleted>(),
    status: multiplexer$({
      blocked: source$<TaskEventStatus>(),
      ready: source$<TaskEventStatus>(),
      starting: source$<TaskEventStatus>(),
      running: source$<TaskEventStatus>(),
      done: source$<TaskEventStatus>(),
      failed: source$<TaskEventStatus>(),
    })
  });

  // Constructor
  protected constructor(context: C, opts: TaskOptions = {}) {
    this.context = context;
    this.id = opts.id ?? crypto.randomUUID();
    this.weight = opts.weight ?? 1;
  }

  // Abstract methods
  /**
   * Called to start the task.
   * @protected
   */
  protected abstract onStart(): void;

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

    //this._logger.debug(`${this.name} is ${status}`);
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

  get status(): TaskStatus {
    return this._status;
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
   * Task weight. Cost to run the task, put a high value to limit
   * parallelization aside this task, defaults to 1.
   */
  readonly weight?: number;
}

export interface TaskEventCompleted {
  readonly status: 'done' | 'failed';
  readonly duration: number;
}

export interface TaskEventStatus<S extends TaskStatus = TaskStatus> {
  readonly previous: TaskStatus;
  readonly status: S;
}
