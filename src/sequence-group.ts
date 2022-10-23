import { waitForEvent } from '@jujulego/event-tree';

import { GroupTask } from './group-task';
import { Task, TaskContext } from './task';

// Class
export class SequenceGroup<C extends TaskContext = TaskContext> extends GroupTask<C> {
  // Attributes
  private _stopped = false;
  private _currentTask?: Task;

  // Methods
  protected async* _orchestrate(): AsyncGenerator<Task> {
    for (const task of this.tasks) {
      if (this._stopped) {
        break;
      }

      // Start task
      this._currentTask = task;
      yield task;

      // Wait task end
      const result = await waitForEvent(task, 'completed');

      if (result.status === 'failed') {
        this.status = 'failed';
        break;
      }
    }
  }

  protected _stop(): void {
    this._stopped = true;

    // Stop current task
    this._currentTask?.stop();
  }
}