import { once$ } from '@jujulego/event-tree';

import { GroupTask } from './group-task.js';
import { Task, TaskContext } from '../task.js';

// Class
export class ParallelGroup<C extends TaskContext = TaskContext> extends GroupTask<C> {
  // Methods
  protected async* _orchestrate(): AsyncGenerator<Task> {
    for (const task of this.tasks) {
      yield task;

      once$(task, 'completed', () => {
        const stats = this.stats;

        if (stats.done + stats.failed === this.tasks.length) {
          this.setStatus(stats.failed > 0 ? 'failed' : 'done');
        }
      });
    }
  }

  protected _stop() {
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
