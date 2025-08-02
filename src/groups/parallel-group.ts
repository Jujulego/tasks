import { once$ } from 'kyrielle';
import type { Task, TaskContext } from '../task.js';
import { GroupTask } from './group-task.js';

// Class
export class ParallelGroup<C extends TaskContext = TaskContext> extends GroupTask<C> {
  // Methods
  protected* onOrchestrate(): Generator<Task> {
    for (const task of this.tasks) {
      yield task;

      once$(task.events$, 'completed', () => {
        const stats = this.stats;

        if (stats.done + stats.failed === this.tasks.length) {
          this.setStatus(stats.failed > 0 ? 'failed' : 'done');
        }
      });
    }
  }

  protected onStop() {
    // Stop all tasks
    for (const task of this.tasks) {
      task.stop();
    }
  }

  complexity(cache: Map<string, number> = new Map()): number {
    let complexity = cache.get(this.id);

    if (complexity === undefined) {
      complexity = 0;

      for (const task of this.tasks) {
        complexity = Math.max(complexity, task.complexity(cache));
      }

      complexity += super.complexity(cache);

      cache.set(this.id, complexity);
    }

    return complexity;
  }
}
