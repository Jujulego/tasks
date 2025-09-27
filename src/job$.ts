import { filter$, once$, pipe$, var$ } from 'kyrielle';
import { dependency$, type Dependency$ } from './dependency$.js';
import { isWorkloadWaiting } from './enums/workload-state.js';
import { workload$, type Workload$, type WorkloadProps } from './workload$.js';

/**
 * A job is a workload that can be part of a greater process. It can be and have dependencies
 * and will blocked by its unsuccessful dependency.
 *
 * @since 3.0.0
 */
export function job$(props: JobProps): Job$ {
  // Bases
  const workload = workload$(props);
  const node = dependency$({
    id: workload.id,
    completed$: workload.completed$,
  });

  // Block management
  const selfBlock$ = var$(false);

  function updateBlock() {
    if (!isWorkloadWaiting(workload.state())) {
      throw new Error(`updateBlock called on a "${workload.state()}" job.`);
    }

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
      const isCompleted$ = pipe$(
        dependency.completed$,
        filter$((isCompleted) => isCompleted),
      );

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

// Types
export type JobProps = WorkloadProps;
export type Job$ = Dependency$ & Workload$;
