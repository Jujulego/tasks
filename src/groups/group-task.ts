import { inherit$, multiplexer$, source$ } from 'kyrielle';
import { type TaskManager } from '../task-manager.js';
import { Task, type TaskContext, type TaskOptions, type TaskStatus, type TaskSummary } from '../task.js';

/**
 * Represents a group of tasks. This task itself does nothing except orchestrating member tasks
 */
export abstract class GroupTask<C extends TaskContext = TaskContext> extends Task<C> {
  // Attributes
  private readonly _tasks: Task[] = [];

  protected readonly groupEvents$ = multiplexer$({
    task: multiplexer$({
      added: source$<Task>(),
      started: source$<Task>(),
      completed: source$<Task>(),
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
  protected abstract onOrchestrate(): AsyncGenerator<Task> | Generator<Task>;

  private async _loop(manager: TaskManager): Promise<void> {
    try {
      for await (const task of this.onOrchestrate()) {
        if (!this._tasks.includes(task)) {
          this.add(task);
        }

        manager.add(task);
      }
    } catch (err) {
      this.logger$.error(`An error happened in group ${this.name}. Stopping it`, err as Error);

      await this.stop();
      this.setStatus('failed');
    }
  }

  protected onStart(manager?: TaskManager) {
    if (!manager) {
      throw new Error('A GroupTask must be started using a TaskManager');
    }

    queueMicrotask(() => void this._loop(manager));
  }

  add(task: Task) {
    if (task.group) {
      throw new Error(`Cannot add task ${task.name} to group ${this.name}, it's already in group ${task.group.name}`);
    }

    // Register task
    this._tasks.push(task);
    task.setGroup(this);

    // Listen to task events
    task.events$.on('status.running', () => {
      this.setStatus('running');
      this.groupEvents$.emit('task.started', task);
    });

    task.events$.on('completed', () => {
      this.groupEvents$.emit('task.completed', task);
    });

    this.groupEvents$.emit('task.added', task);
  }

  // Properties
  get events$() {
    return inherit$(this.taskEvents$, this.groupEvents$);
  }

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

// Types
export type GroupTaskStats = Record<TaskStatus, number>;
