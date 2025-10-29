import { iterator$, type SimpleIterator } from 'kyrielle';
import type { Job$ } from '../job$.js';
import { type Workload$ } from '../workload$.js';
import { isJob$ } from './predicates.js';

/**
 * Builds iterator on all dependencies of given job.
 */
export function dependenciesOf(job: Job$): SimpleIterator<Workload$> {
  const queue = [...job.dependencies()];
  const marks = new Set(queue);

  return iterator$({
    next() {
      const item = queue.shift();

      if (!item) {
        return { done: true };
      }

      if (isJob$(item)) {
        for (const dependency of item.dependencies()) {
          if (marks.has(dependency)) {
            continue;
          }

          marks.add(dependency);
          queue.push(dependency);
        }
      }

      return {
        done: false,
        value: item
      };
    }
  });
}
