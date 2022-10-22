import { waitForEvent } from '@jujulego/event-tree';

import { GroupTask } from './group-task';
import { Task, TaskContext } from './task';

// Class
export class SequenceGroup<C extends TaskContext = TaskContext> extends GroupTask<C> {
  // Methods
  protected async* _orchestrate(): AsyncGenerator<Task> {
    for (const task of this.tasks) {
      yield task;

      const result = await waitForEvent(task, 'completed');

      if (result.status === 'failed') {
        this.status = 'failed';
        break;
      }
    }
  }
}
