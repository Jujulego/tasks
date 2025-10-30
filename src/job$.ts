import { filter$, once$, pipe$, var$ } from 'kyrielle';
import { isWorkloadEnded, isWorkloadWaiting, WorkloadState } from './enums/workload-state.js';
import { workload$, type Workload$, type WorkloadProps } from './workload$.js';
import { assert } from './utils/assert.js';

/**
 * A job is a workload that can be part of a greater process. It can be and have dependencies
 * and will blocked by its unsuccessful dependency.
 *
 * @since 3.0.0
 */
export function job$(props: JobProps): Job$ {
  const dependencies: Workload$[] = [];
  const workload = workload$({ type: 'job', ...props });

  // Block management
  const selfBlock$ = var$(false);

  function updateBlock() {
    assert(isWorkloadWaiting(workload.state()), `updateBlock called on a "${workload.state()}" job.`);

    const selfBlock = selfBlock$.defer();
    const depsBlock = dependencies.some((dep) => !isWorkloadEnded(dep.state()));

    if (selfBlock || depsBlock) {
      workload.block();
    } else {
      workload.unblock();
    }
  }

  // Build object
  return {
    ...workload,

    dependencies(): readonly Workload$[] {
      return dependencies;
    },
    dependsOn(dependency: Workload$) {
      if (!isWorkloadWaiting(workload.state())) {
        throw new Error(`Cannot add dependency to job in "${workload.state()}" state.`);
      }

      dependencies.push(dependency);

      if (!isWorkloadEnded(dependency.state())) {
        workload.block();
      }

      // Track dependency state
      const finalState$ = pipe$(dependency.state$, filter$(isWorkloadEnded));

      once$(finalState$, (state) => {
        if (state === WorkloadState.Succeeded) {
          updateBlock();
        } else {
          void workload.cancel();
        }
      });
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
export interface JobProps extends Omit<WorkloadProps, 'type'> {
  /**
   * Type of job. Defaults to "job".
   */
  readonly type?: string;
}

export interface Job$ extends Workload$ {
  /**
   * Job's dependencies.
   */
  dependencies(this: void): readonly Workload$[];

  /**
   * Adds a dependency to this job.
   */
  dependsOn(this: void, node: Workload$): void;
}

