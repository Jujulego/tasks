import { GroupTask } from './group-task';
import { Task, TaskContext } from './task';

// Class
export class ParallelGroup<C extends TaskContext = TaskContext> extends GroupTask<C> {
  // Methods
  protected async* _orchestrate(): AsyncGenerator<Task> {
    for (const task of this.tasks) {
      yield task;

      task.subscribe('completed', () => {
        const stats = this.stats;

        if (stats.done + stats.failed === this.tasks.length) {
          this.status = stats.failed > 0 ? 'failed' : 'done';
        }
      });
    }
  }
}
