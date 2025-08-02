import { waitFor$ } from 'kyrielle';
import type { Task, TaskContext } from '../task.js';
import { SequenceGroup } from './sequence-group.js';

// Class
export class FallbackGroup<C extends TaskContext = TaskContext> extends SequenceGroup<C> {
  // Methods
  protected async* onOrchestrate(): AsyncGenerator<Task> {
    for (const task of this.runInOrder()) {
      yield task;

      // Wait task end
      const result = await waitFor$(task.events$, 'completed');

      if (result.status === 'done') {
        this.setStatus('done');
        return;
      }
    }

    this.setStatus('failed');
  }
}
