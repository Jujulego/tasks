import { AnyTask, Task, TaskContext, TaskEventMap, TaskOptions, TaskStatus } from './task';
import { TaskManager } from './task-manager';

// Types
export interface GroupTaskEventMap extends TaskEventMap {
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
  protected constructor(
    readonly name: string,
    context: C,
    opts?: TaskOptions
  ) {
    super(context, opts);
  }

  // Methods
  protected abstract _orchestrate(): AsyncGenerator<Task>;

  protected async _start(manager?: TaskManager): Promise<void> {
    if (!manager) {
      throw new Error('A GroupTask must be started using a TaskManager');
    }

    if (this._tasks.length > 0) {
      for await (const task of this._orchestrate()) {
        manager.add(task);
      }
    } else {
      this._logger.verbose(`no tasks in group ${this.name}`);
      this.status = 'done';
    }
  }

  protected _stop() {
    // Stop all tasks
    for (const task of this._tasks) {
      task.stop();
    }
  }

  add(task: AnyTask) {
    if ((task as Task).context.groupTaskId) {
      throw new Error(`Cannot add task ${task.name} to group ${this.name}, it's already in an other group.`);
    }

    // Register task
    this._tasks.push(task);
    (task as Task).context.groupTaskId = this.id;

    // Listen to task events
    (task as Task).subscribe('status.running', () => {
      this.emit('task.started', task);
    });

    (task as Task).subscribe('completed', () => {
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
