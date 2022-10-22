import { GroupTask } from './group-task';
import { TaskContext } from './task';
import { TaskManager } from './task-manager';

// Class
export class ParallelGroup<C extends TaskContext = TaskContext> extends GroupTask<C> {
  // Methods
  protected _orchestrate(manager: TaskManager) {
    for (const task of this.tasks) {
      manager.add(task);

      task.subscribe('completed', () => {
        const stats = this.stats;

        if (stats.done + stats.failed === this.tasks.length) {
          this.status = stats.failed > 0 ? 'failed' : 'done';
        }
      });
    }
  }
}
