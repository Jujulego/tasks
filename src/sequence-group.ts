import { GroupTask } from './group-task';
import { TaskContext } from './task';
import { TaskManager } from './task-manager';
import { waitForEvent } from '@jujulego/event-tree';

// Class
export class SequenceGroup<C extends TaskContext = TaskContext> extends GroupTask<C> {
  // Methods
  protected async _orchestrate(manager: TaskManager) {
    for (const task of this.tasks) {
      manager.add(task);

      const result = await waitForEvent(task, 'completed');

      if (result.status === 'failed') {
        this.status = 'failed';
        break;
      }
    }
  }
}
