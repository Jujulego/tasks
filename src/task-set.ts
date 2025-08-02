import { multiplexer$, source$ } from 'kyrielle';
import type { TaskManager } from './task-manager.js';
import type { Task } from './task.js';

// Class
export class TaskSet<T extends Task = Task> implements Iterable<T> {
  // Attributes
  private _status: TaskSetStatus = 'created';
  private _successCount = 0;
  private _failureCount = 0;
  private readonly _tasks = new Set<T>();

  readonly events$ = multiplexer$({
    started: source$<T>(),
    completed: source$<T>(),
    finished: source$<TaskSetResults>(),
  });

  // Methods
  private _handleComplete(task: T, success: boolean): void {
    this.events$.emit('completed', task);

    // Trigger finished
    if (success) {
      ++this._successCount;
    } else {
      ++this._failureCount;
    }

    if (this._successCount + this._failureCount === this._tasks.size) {
      this._status = 'finished';
      this.events$.emit('finished', this.results);
    }
  }

  add(task: T): void {
    if (this._status !== 'created') {
      throw Error(`Cannot add a task to a ${this._status} task set`);
    }

    if (this._tasks.has(task)) {
      return;
    }

    // Listen to task's status
    task.events$.on('status', ({ status }) => {
      if (status === 'running') {
        this.events$.emit('started', task);
      } else if (status === 'done' || status === 'failed') {
        this._handleComplete(task, status === 'done');
      }
    });

    // Add task
    this._tasks.add(task);
  }

  start(manager: TaskManager): void {
    if (this._status !== 'created') {
      throw Error(`Cannot start a ${this._status} task set`);
    }

    if (this._tasks.size === 0) {
      this._status = 'finished';
      this.events$.emit('finished', {
        success: 0,
        failed: 0,
      });
    } else {
      // Update status
      this._status = 'started';

      // Add tasks to task manager
      for (const t of this._tasks) {
        manager.add(t);
      }
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this._tasks.values();
  }

  // Properties
  get status(): TaskSetStatus {
    return this._status;
  }

  get tasks(): ReadonlyArray<T> {
    return Array.from(this._tasks.values());
  }

  get results(): TaskSetResults {
    return {
      success: this._successCount,
      failed: this._failureCount,
    };
  }
}

// Types
export type TaskSetStatus = 'created' | 'started' | 'finished';

export interface TaskSetResults {
  readonly success: number;
  readonly failed: number;
}
