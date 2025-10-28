import { is$, once$, pipe$, var$ } from 'kyrielle';
import { dependency$, type Dependency$, isDependency$ } from './dependency$.js';
import { isWorkloadWaiting } from './enums/workload-state.js';
import type { NonNullObject } from './types.js';
import { assert } from './utils/assert.js';
import { isWorkload$, workload$, type Workload$, type WorkloadProps } from './workload$.js';

/**
 * A job is a workload that can be part of a greater process. It can be and have dependencies
 * and will blocked by its unsuccessful dependency.
 *
 * @since 3.0.0
 */
export function job$(props: JobProps): Job$ {
  // Bases
  const workload = workload$({ type: 'job', ...props });
  const node = dependency$(workload);

  // Block management
  const selfBlock$ = var$(false);

  function updateBlock() {
    assert(isWorkloadWaiting(workload.state()), `updateBlock called on a "${workload.state()}" job.`);

    const selfBlock = selfBlock$.defer();
    const depsBlock = node.dependencies.some((dep) => !dep.completed$.defer());

    if (!selfBlock && !depsBlock) {
      workload.unblock();
    } else {
      workload.block();
    }
  }

  // Build object
  return {
    ...node,
    ...workload,

    dependsOn(dependency: Dependency$) {
      if (!isWorkloadWaiting(workload.state())) {
        throw new Error(`Cannot add dependency to job in "${workload.state()}" state.`);
      }

      node.dependsOn(dependency);

      if (!dependency.completed$.defer()) {
        workload.block();
      }

      // Track dependency state
      const isCompleted$ = pipe$(dependency.completed$, is$(true));
      once$(isCompleted$, updateBlock);
    },

    block() {
      selfBlock$.mutate(true);
      updateBlock();
    },

    unblock() {
      selfBlock$.mutate(false);
      updateBlock();
    }
  };
}

// Utils
export function isJob$<T>(value: T): value is T & NonNullObject & Job$ {
  return isDependency$(value) && isWorkload$(value);
}

// Types
export interface JobProps extends Omit<WorkloadProps, 'type'> {
  /**
   * Type of job. Defaults to "job".
   */
  readonly type?: string;
}

export type Job$ = Dependency$ & Workload$;

