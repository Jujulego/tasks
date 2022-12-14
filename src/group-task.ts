import { AnyTask, assertIsTask, Task, TaskContext, TaskEventMap, TaskOptions, TaskStatus } from './task';
import { TaskManager } from './task-manager';

// Types
export type GroupTaskEventMap = TaskEventMap & {
  'task.added': Task;
  'task.started': Task;
  'task.completed': Task;
}

export type GroupTaskStats = Record<TaskStatus, number>;

// Class
export abstract class GroupTask<C extends TaskContext = TaskContext, M extends GroupTaskEventMap = GroupTaskEventMap> extends Task<C, M> {
  // Attributes
  private readonly _tasks: Task[] = [];

  // Constructor
  constructor(
    readonly name: string,
    context: C,
    opts?: TaskOptions
  ) {
    super(context, { weight: 0, ...opts });
  }

  // Methods
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
      this.status = 'failed';
    }
  }

  protected _start(manager?: TaskManager): void {
    if (!manager) {
      throw new Error('A GroupTask must be started using a TaskManager');
    }

    this._loop(manager);
  }

  add(task: AnyTask) {
    assertIsTask(task);

    if (task.context.groupTask) {
      throw new Error(`Cannot add task ${task.name} to group ${this.name}, it's already in group ${task.context.groupTask.name}`);
    }

    // Register task
    this._tasks.push(task);
    task.context.groupTask = this;

    // Listen to task events
    task.subscribe('status.running', () => {
      this.emit('task.started', task);
    });

    task.subscribe('completed', () => {
      this.emit('task.completed', task);
    });

    this.emit('task.added', task);
  }

  // Properties
  get tasks(): readonly Task[] {
    return this._tasks;
  }

  get stats(): Readonly<GroupTaskStats> {
    const stats: GroupTaskStats = {
      blocked: 0,
      ready: 0,
      running: 0,
      done: 0,
      failed: 0,
    };

    for (const task of this._tasks) {
      stats[task.status]++;
    }

    return stats;
  }
}
