import { IListenable, inherit, InheritEventMap, multiplexer, source } from '@jujulego/event-tree';

import { Task, TaskContext, TaskEventMap, TaskOptions, TaskStatus, TaskSummary } from './task.js';
import { TaskManager } from './task-manager.js';

// Types
export type GroupTaskStats = Record<TaskStatus, number>;

export type GroupTaskEventMap = InheritEventMap<TaskEventMap, {
  'task.added': Task;
  'task.started': Task;
  'task.completed': Task;
}>;

// Class
export abstract class GroupTask<C extends TaskContext = TaskContext> extends Task<C> implements IListenable<GroupTaskEventMap> {
  // Attributes
  private readonly _tasks: Task[] = [];

  protected readonly _groupEvents = inherit(this._taskEvents,  {
    task: multiplexer({
      added: source<Task>(),
      started: source<Task>(),
      completed: source<Task>(),
    })
  });

  // Constructor
  constructor(
    readonly name: string,
    context: C,
    opts?: TaskOptions
  ) {
    super(context, { weight: 0, ...opts });
  }

  // Methods
  readonly on = this._groupEvents.on;
  readonly off = this._groupEvents.off;
  readonly clear = this._groupEvents.clear;

  protected abstract _orchestrate(): AsyncGenerator<Task>;

  private async _loop(manager: TaskManager): Promise<void> {
    try {
      for await (const task of this._orchestrate()) {
        if (!this._tasks.includes(task)) {
          this.add(task);
        }

        manager.add(task);
      }
    } catch (err) {
      this._logger.error(`An error happened in group ${this.name}. Stopping it`, err);

      this.stop();
      this.setStatus('failed');
    }
  }

  protected _start(manager?: TaskManager): void {
    if (!manager) {
      throw new Error('A GroupTask must be started using a TaskManager');
    }

    this._loop(manager);
  }

  add(task: Task) {
    if (task.group) {
      throw new Error(`Cannot add task ${task.name} to group ${this.name}, it's already in group ${task.group.name}`);
    }

    // Register task
    this._tasks.push(task);
    task.setGroup(this);

    // Listen to task events
    task.on('status.running', () => {
      this.setStatus('running');
      this._groupEvents.emit('task.started', task);
    });

    task.on('completed', () => {
      this._groupEvents.emit('task.completed', task);
    });

    this._groupEvents.emit('task.added', task);
  }

  // Properties
  get tasks(): readonly Task[] {
    return this._tasks;
  }

  get stats(): Readonly<GroupTaskStats> {
    const stats: GroupTaskStats = {
      blocked: 0,
      ready: 0,
      starting: 0,
      running: 0,
      done: 0,
      failed: 0,
    };

    for (const task of this._tasks) {
      stats[task.status]++;
    }

    return stats;
  }

  get summary(): TaskSummary<C> {
    return Object.assign(super.summary, {
      isGroup: true,
    });
  }
}
