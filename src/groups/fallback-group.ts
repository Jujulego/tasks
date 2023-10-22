import { waitFor$ } from '@jujulego/event-tree';

import { Task, TaskContext } from '../task.js';
import { SequenceGroup } from './sequence-group.js';

// Class
export class FallbackGroup<C extends TaskContext = TaskContext> extends SequenceGroup<C> {
  // Methods
  protected async* _orchestrate(): AsyncGenerator<Task> {
    for (const task of this._runInOrder()) {
      yield task;

      // Wait task end
      const result = await waitFor$(task, 'completed');

      if (result.status === 'done') {
        this.setStatus('done');
        return;
      }
    }

    this.setStatus('failed');
  }
}
