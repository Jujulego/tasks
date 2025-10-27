import { filter$, iterator$, pipe$, type SimpleIterator } from 'kyrielle';
import type { Registry$ } from '../bases/registry$.js';
import { type Dependency, type Dependency$, isDependency$ } from '../dependency$.js';
import { isWorkload$, type Workload$ } from '../workload$.js';

/**
 * Builds iterator on all dependencies of given element.
 */
export function allDependencies$(node: Dependency$): SimpleIterator<Dependency> {
  const queue: Dependency[] = [node];
  const marks = new Set(queue);

  return iterator$({
    next() {
      const item = queue.shift();

      if (!item) {
        return { done: true };
      }

      if (isDependency$(item)) {
        for (const dependency of item.dependencies) {
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

/**
 * Recursively registers workload and all its dependencies into given registry.
 */
export function recursiveRegister(registry: Registry$, workload: Workload$ & Dependency$) {
  registry.register(workload);

  const dependencies = pipe$(
    allDependencies$(workload),
    filter$((dep) => isDependency$(dep) && isWorkload$(dep))
  );

  for (const dependency of dependencies) {
    registry.register(dependency);
  }
}
