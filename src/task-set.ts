import { EventSource } from '@jujulego/event-tree';

import { AnyTask, assertIsTask, Task } from './task';
import { TaskManager } from './task-manager';

// Types
export interface TaskSetResults {
  success: number;
  failed: number;
}

export type TaskSetStatus = 'created' | 'started' | 'finished';
export type TaskSetEventMap = {
  started: Task,
  completed: Task,
  finished: Readonly<TaskSetResults>
}

// Class
export class TaskSet extends EventSource<TaskSetEventMap> {
  // Attributes
  private readonly _tasks = new Set<Task>();

  private _status: TaskSetStatus = 'created';
  private readonly _results: TaskSetResults = {
    success: 0,
    failed: 0,
  };

  // Constructor
  constructor(
    readonly manager: TaskManager
  ) {
    super();
  }

  // Methods
  private _handleComplete(task: Task, success: boolean): void {
    this.emit('completed', task);

    // Trigger finished
    if (success) {
      ++this._results.success;
    } else {
      ++this._results.failed;
    }

    if (this._results.success + this._results.failed === this._tasks.size) {
      this._status = 'finished';
      this.emit('finished', this._results);
    }
  }

  add(task: AnyTask): void {
    assertIsTask(task);

    if (this._status !== 'created') {
      throw Error(`Cannot add a task to a ${this._status} task set`);
    }

    if (this._tasks.has(task)) {
      return;
    }

    // Listen to task's status
    task.subscribe('status', ({ status }) => {
      if (status === 'running') {
        this.emit('started', task);
      } else if (status === 'done' || status === 'failed') {
        this._handleComplete(task, status === 'done');
      }
    });

    // Add task
    this._tasks.add(task);
  }

  start(): void {
    if (this._status !== 'created') {
      throw Error(`Cannot start a ${this._status} task set`);
    }

    if (this._tasks.size === 0) {
      this._status = 'finished';
      this.emit('finished', this._results);
    } else {
      // Update status
      this._status = 'started';

      // Add tasks to task manager
      for (const t of this._tasks) {
        this.manager.add(t);
      }
    }
  }

  // Properties
  get status(): TaskSetStatus {
    return this._status;
  }

  get tasks(): ReadonlyArray<Task> {
    return Array.from(this._tasks.values());
  }

  get results(): Readonly<TaskSetResults> {
    return this._results;
  }
}
