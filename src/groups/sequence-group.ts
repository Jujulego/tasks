import { waitFor$ } from 'kyrielle';
import type { Task, TaskContext } from '../task.js';
import { GroupTask } from './group-task.js';

// Class
export class SequenceGroup<C extends TaskContext = TaskContext> extends GroupTask<C> {
  // Attributes
  private _stopped = false;
  private _currentTask?: Task;

  // Methods
  protected* runInOrder(): Generator<Task> {
    for (const task of this.tasks) {
      if (this._stopped) {
        this.setStatus('failed');
        return;
      }

      // Start task
      this._currentTask = task;
      yield task;
    }
  }

  protected async* onOrchestrate(): AsyncGenerator<Task> {
    for (const task of this.runInOrder()) {
      yield task;

      // Wait task end
      const result = await waitFor$(task.events$, 'completed');

      if (result.status === 'failed') {
        this.setStatus('failed');
        return;
      }
    }

    if (!this._stopped) {
      this.setStatus('done');
    }
  }

  protected async onStop() {
    this._stopped = true;

    // Stop current task
    await this._currentTask?.stop();
  }

  complexity(cache: Map<string, number> = new Map()): number {
    let complexity = super.complexity(cache);

    if (this.tasks.length > 0) {
      complexity += this.tasks[0]!.complexity(cache);
    }

    cache.set(this.id, complexity);

    return complexity;
  }
}
