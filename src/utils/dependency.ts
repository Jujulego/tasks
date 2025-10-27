import type { Registry$ } from '../bases/registry$.js';
import { type Dependency$, isDependency$ } from '../dependency$.js';
import { isWorkload$, type Workload$ } from '../workload$.js';

/**
 * Recursively registers workload and all its dependencies into given registry.
 */
export function recursiveRegister(registry: Registry$, workload: Workload$ & Dependency$) {
  const queue = [workload];
  const marks = new Set(queue);

  while (queue.length) {
    const item = queue.shift()!;
    registry.register(item);

    for (const dependency of item.dependencies) {
      if (!isWorkload$(dependency) || !isDependency$(dependency)) {
        continue;
      }

      if (marks.has(dependency)) {
        continue;
      }

      marks.add(dependency);
      queue.push(dependency);
    }
  }
}